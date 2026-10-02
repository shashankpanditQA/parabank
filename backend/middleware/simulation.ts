import type { Request, Response, NextFunction } from 'express';

/**
 * Failure injection & network delay simulation.
 *
 * Three ways to trigger it:
 *  1. Lab UI: POST /api/lab/simulation  (stored per browser via the `pb_lab` cookie)
 *  2. Header on any request:  x-simulate-failure: 500 | 401 | 403 | 404 | 408 | 429 | network | invalid-json
 *                             x-simulate-delay: 3000
 *  3. Query string:           ?__fail=500&__delay=1000
 */
export type FailureMode = '500' | '401' | '403' | '404' | '408' | '429' | 'network' | 'slow' | 'invalid-json';

export interface SimulationConfig {
  failure: null | { mode: FailureMode; endpoint: string; method: string; times: number | null };
  delays: Record<string, number>; // endpoint prefix -> ms
}

export const FAILURE_MODES: FailureMode[] = ['500', '401', '403', '404', '408', '429', 'network', 'slow', 'invalid-json'];
export const SIMULATED_ENDPOINTS = [
  '*', '/api/accounts', '/api/transactions', '/api/transfers', '/api/payments', '/api/loans',
  '/api/cards', '/api/beneficiaries', '/api/notifications', '/api/support/tickets', '/api/dashboard',
];

const store = new Map<string, SimulationConfig>();

export function labKey(req: Request): string {
  return (req.cookies?.pb_lab as string) || (req.headers['x-lab-key'] as string) || 'anonymous';
}
export function getSimulation(key: string): SimulationConfig {
  if (!store.has(key)) store.set(key, { failure: null, delays: {} });
  return store.get(key)!;
}
export function setSimulation(key: string, cfg: SimulationConfig) {
  store.set(key, cfg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MESSAGES: Record<string, [number, string, string]> = {
  '500': [500, 'INTERNAL_SERVER_ERROR', 'Something went wrong on our side. Please try again later.'],
  '401': [401, 'UNAUTHORIZED', 'Authentication is required to access this resource.'],
  '403': [403, 'FORBIDDEN', 'You do not have permission to perform this action.'],
  '404': [404, 'NOT_FOUND', 'The requested resource was not found.'],
  '408': [408, 'REQUEST_TIMEOUT', 'The server timed out waiting for the request.'],
  '429': [429, 'TOO_MANY_REQUESTS', 'Rate limit exceeded. Please retry after 30 seconds.'],
};

async function applyFailure(mode: string, res: Response): Promise<boolean> {
  if (mode === 'network') {
    res.socket?.destroy();
    return true;
  }
  if (mode === 'slow') {
    await sleep(8000);
    return false;
  }
  if (mode === 'invalid-json') {
    res.status(200).type('application/json').send('{"success": true, "data": [ {"id": "TXN-1", "amount": 12');
    return true;
  }
  const m = MESSAGES[mode];
  if (!m) return false;
  if (mode === '408') await sleep(1500);
  if (mode === '429') res.setHeader('Retry-After', '30');
  res.status(m[0]).json({ success: false, errorCode: m[1], message: m[2], simulated: true });
  return true;
}

export async function simulation(req: Request, res: Response, next: NextFunction) {
  const path = req.originalUrl.split('?')[0];
  if (!path.startsWith('/api/') || path.startsWith('/api/lab') || path.startsWith('/api/auth') || path.startsWith('/api/health')) {
    return next();
  }
  try {
    // Per-request overrides (great for API tests)
    const headerDelay = Number(req.headers['x-simulate-delay'] ?? req.query.__delay ?? 0);
    const headerFail = String(req.headers['x-simulate-failure'] ?? req.query.__fail ?? '');
    if (headerDelay > 0) await sleep(Math.min(headerDelay, 15000));
    if (headerFail && (await applyFailure(headerFail, res))) return;

    // Lab console configuration
    const cfg = store.get(labKey(req));
    if (cfg) {
      const delayKey = Object.keys(cfg.delays).find((k) => k === '*' || path.startsWith(k));
      if (delayKey && cfg.delays[delayKey] > 0) await sleep(cfg.delays[delayKey]);
      const f = cfg.failure;
      if (f && (f.endpoint === '*' || path.startsWith(f.endpoint)) && (f.method === 'ANY' || f.method === req.method)) {
        if (f.times !== null) {
          f.times -= 1;
          if (f.times <= 0) cfg.failure = null;
        }
        if (await applyFailure(f.mode, res)) return;
      }
    }
    next();
  } catch (e) {
    next(e);
  }
}
