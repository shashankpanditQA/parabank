import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { all, db, get } from '../database/db.js';
import { seedDatabase, DEMO_OTP, DEMO_PASSWORD, ADMIN_PASSWORD } from '../../seed/seed.js';
import { hashSecret } from '../utils/ids.js';
import { ApiError, badRequest, str } from '../utils/http.js';
import { FAILURE_MODES, SIMULATED_ENDPOINTS, getSimulation, labKey, setSimulation, type FailureMode } from '../middleware/simulation.js';
import { readToken } from '../middleware/auth.js';

export function health(_req: Request, res: Response) {
  res.json({ success: true, status: 'UP', service: 'ParaBank Pro API', version: '1.0.0', time: new Date().toISOString() });
}

export function labInfo(_req: Request, res: Response) {
  const meta = get('SELECT value FROM meta WHERE key = ?', 'seed');
  res.json({
    success: true,
    seed: meta ? JSON.parse(meta.value) : null,
    demo: {
      customer: { username: 'john', password: DEMO_PASSWORD },
      secondCustomer: { username: 'sarah', password: DEMO_PASSWORD },
      admin: { username: 'admin', password: ADMIN_PASSWORD },
      lockedUser: { username: 'locked', password: DEMO_PASSWORD },
      disabledUser: { username: 'disabled', password: DEMO_PASSWORD },
      otp: DEMO_OTP,
      testCards: {
        success: '4111111111111111',
        declined: '4000000000000002',
        timeout: '4000000000000119',
      },
    },
  });
}

/** Restore the deterministic seed dataset. Sessions survive (user IDs never change). */
export function resetData(_req: Request, res: Response) {
  const result = seedDatabase(db, { random: false, hash: hashSecret });
  res.json({ success: true, ...result, message: 'Practice data has been reset to the original seed.' });
}

export function generateData(_req: Request, res: Response) {
  const result = seedDatabase(db, { random: true, hash: hashSecret });
  res.json({ success: true, ...result, message: 'A new randomized test dataset has been generated.' });
}

// ---------------------------------------------------------------- Simulation config
export function getSimulationConfig(req: Request, res: Response) {
  ensureLabCookie(req, res);
  res.json({ success: true, modes: FAILURE_MODES, endpoints: SIMULATED_ENDPOINTS, config: getSimulation(labKey(req)) });
}

function ensureLabCookie(req: Request, res: Response): string {
  let key = req.cookies?.pb_lab as string | undefined;
  if (!key && !req.headers['x-lab-key']) {
    key = `LAB-${crypto.randomBytes(6).toString('hex')}`;
    res.cookie('pb_lab', key, { sameSite: 'lax', path: '/' });
    req.cookies = { ...(req.cookies ?? {}), pb_lab: key };
  }
  return labKey(req);
}

export function setSimulationConfig(req: Request, res: Response) {
  const key = ensureLabCookie(req, res);
  const cfg = getSimulation(key);
  const b = req.body ?? {};
  if (b.failure === null) cfg.failure = null;
  else if (b.failure) {
    const mode = str(b.failure.mode) as FailureMode;
    if (!FAILURE_MODES.includes(mode)) throw badRequest('INVALID_MODE', `Failure mode must be one of: ${FAILURE_MODES.join(', ')}`);
    const endpoint = str(b.failure.endpoint) || '*';
    const times = b.failure.times == null || b.failure.times === '' ? null : Math.max(1, Number(b.failure.times));
    cfg.failure = { mode, endpoint, method: str(b.failure.method || 'ANY').toUpperCase(), times };
  }
  if (b.delays && typeof b.delays === 'object') {
    cfg.delays = {};
    for (const [k, v] of Object.entries(b.delays)) {
      const ms = Math.min(Math.max(Number(v) || 0, 0), 15000);
      if (ms > 0) cfg.delays[k] = ms;
    }
  }
  setSimulation(key, cfg);
  res.json({ success: true, config: cfg, message: 'Simulation settings saved' });
}

export function clearSimulation(req: Request, res: Response) {
  setSimulation(ensureLabCookie(req, res), { failure: null, delays: {} });
  res.json({ success: true, message: 'All simulated failures and delays cleared' });
}

// ---------------------------------------------------------------- Network lab helpers
/** Echo the request back — useful to verify request modification with page.route(). */
export function echo(req: Request, res: Response) {
  const headers = { ...req.headers };
  delete headers.cookie;
  delete headers.authorization;
  res.status(req.method === 'POST' ? 201 : 200).json({
    success: true,
    method: req.method,
    path: req.originalUrl,
    query: req.query,
    headers,
    body: req.body ?? null,
    receivedAt: new Date().toISOString(),
  });
}

export async function slow(req: Request, res: Response) {
  const ms = Math.min(Math.max(Number(req.query.ms) || 2000, 0), 15000);
  await new Promise((r) => setTimeout(r, ms));
  res.json({ success: true, delayedBy: ms, message: `Responded after ${ms} ms` });
}

/** Dynamic data endpoint: different values on every call. */
export function randomQuote(_req: Request, res: Response) {
  const rates = { EUR: 0.92, GBP: 0.79, INR: 83.2, JPY: 149.5 };
  const jitter = () => 1 + (Math.random() - 0.5) * 0.02;
  res.json({
    success: true,
    quoteId: `FX-${Math.floor(100000 + Math.random() * 900000)}`,
    base: 'USD',
    rates: Object.fromEntries(Object.entries(rates).map(([k, v]) => [k, Math.round(v * jitter() * 10000) / 10000])),
    generatedAt: new Date().toISOString(),
    expiresInSeconds: 30,
  });
}

/** Read-only directory for nested table practice: Customer -> Account -> Transactions. */
export function directory(_req: Request, res: Response) {
  const customers = all(`SELECT * FROM customers WHERE status = 'ACTIVE' ORDER BY last_name LIMIT 8`);
  const data = customers.map((c) => ({
    customerId: c.id,
    name: `${c.first_name} ${c.last_name}`,
    city: c.city,
    segment: c.segment,
    accounts: all('SELECT * FROM accounts WHERE customer_id = ? ORDER BY type', c.id).map((a) => ({
      accountNumber: a.id,
      type: a.type,
      balance: a.balance,
      transactions: all('SELECT id, date, description, amount, direction, status FROM transactions WHERE account_id = ? ORDER BY date DESC LIMIT 3', a.id).map((t) => ({
        transactionId: t.id,
        date: t.date,
        description: t.description,
        amount: t.direction === 'CREDIT' ? t.amount : -t.amount,
        status: t.status,
      })),
    })),
  }));
  res.json({ success: true, count: data.length, data });
}

/**
 * Database inspector for "API + database consistency" challenges.
 * Customers only see their own rows; admins see everything. Secrets are never exposed.
 */
const DB_TABLES: Record<string, { scope: string; columns: string }> = {
  accounts: { scope: 'customer_id = ?', columns: '*' },
  transactions: { scope: 'account_id IN (SELECT id FROM accounts WHERE customer_id = ?)', columns: '*' },
  transfers: { scope: 'customer_id = ?', columns: '*' },
  payments: { scope: 'customer_id = ?', columns: '*' },
  loans: { scope: 'customer_id = ?', columns: '*' },
  beneficiaries: { scope: 'customer_id = ?', columns: '*' },
  cards: { scope: 'customer_id = ?', columns: 'id, customer_id, account_id, card_type, network, last4, status, spending_limit, created_at' },
  notifications: { scope: 'customer_id = ?', columns: '*' },
  tickets: { scope: 'customer_id = ?', columns: '*' },
  documents: { scope: 'customer_id = ?', columns: '*' },
};

export function dbInspect(req: Request, res: Response) {
  const table = String(req.params.table);
  const cfg = DB_TABLES[table];
  if (!cfg) throw new ApiError(404, 'UNKNOWN_TABLE', `Table "${table}" is not inspectable. Allowed: ${Object.keys(DB_TABLES).join(', ')}`);
  const where: string[] = [];
  const params: any[] = [];
  if (req.user?.role !== 'ADMIN') {
    where.push(cfg.scope);
    params.push(req.user!.customerId);
  }
  if (str(req.query.id)) {
    where.push('id = ?');
    params.push(str(req.query.id));
  }
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const order = table === 'transactions' ? 'date' : table === 'payments' || table === 'transfers' || table === 'notifications' ? 'created_at' : 'rowid';
  const rows = all(`SELECT ${cfg.columns} FROM ${table} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} DESC LIMIT ${limit}`, ...params);
  res.json({ success: true, table, count: rows.length, rows });
}

export function sessionInfo(req: Request, res: Response) {
  const token = readToken(req);
  const s = token ? get('SELECT id, user_id, created_at, expires_at, remember_me FROM sessions WHERE id = ?', token) : null;
  res.json({ success: true, hasSession: !!s, session: s ? { ...s, expired: new Date(s.expires_at).getTime() < Date.now() } : null });
}
