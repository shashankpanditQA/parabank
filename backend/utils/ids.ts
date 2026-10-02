import crypto from 'node:crypto';
import { get } from '../database/db.js';

/** Random 6-digit suffix, e.g. 928371 */
export function digits(n = 6): string {
  let out = String(crypto.randomInt(1, 10));
  while (out.length < n) out += String(crypto.randomInt(0, 10));
  return out;
}

const TABLE_FOR_PREFIX: Record<string, string> = {
  TXN: 'transactions',
  TRF: 'transfers',
  PAY: 'payments',
  LOAN: 'loans',
  TKT: 'tickets',
  BEN: 'beneficiaries',
  NTF: 'notifications',
  CRD: 'cards',
  DOC: 'documents',
  SES: 'sessions',
};

/** Generates a unique, human-friendly ID such as TXN-928371 (checked against the DB). */
export function newId(prefix: string, len = 6): string {
  const table = TABLE_FOR_PREFIX[prefix];
  for (let i = 0; i < 50; i++) {
    const id = `${prefix}-${digits(len)}`;
    if (!table || !get(`SELECT 1 FROM ${table} WHERE id = ?`, id)) return id;
  }
  return `${prefix}-${digits(len + 3)}`;
}

export function newAccountNumber(type: string): string {
  const prefix = type === 'SAVINGS' ? 'SAV' : type === 'CREDIT' ? 'CRD' : 'CHK';
  for (let i = 0; i < 50; i++) {
    const id = `${prefix}-${digits(6)}`;
    if (!get('SELECT 1 FROM accounts WHERE id = ?', id)) return id;
  }
  return `${prefix}-${digits(9)}`;
}

export function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = crypto.scryptSync(secret, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifySecret(secret: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(secret, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

export const nowIso = () => new Date().toISOString();

export const round2 = (n: number) => Math.round(n * 100) / 100;
