import type { Request, Response, NextFunction } from 'express';
import { get, run } from '../database/db.js';
import { ApiError } from '../utils/http.js';

export const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes (sliding)
export const REMEMBER_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthUser {
  userId: string;
  username: string;
  role: 'CUSTOMER' | 'ADMIN';
  customerId: string | null;
  sessionId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return (req.cookies?.pb_session as string) || null;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required. Please log in.'));
  const session = get('SELECT * FROM sessions WHERE id = ?', token);
  if (!session) return next(new ApiError(401, 'INVALID_TOKEN', 'Your session token is invalid. Please log in again.'));
  if (new Date(session.expires_at).getTime() < Date.now()) {
    return next(new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired. Please log in again.'));
  }
  const user = get('SELECT * FROM users WHERE id = ?', session.user_id);
  if (!user) return next(new ApiError(401, 'INVALID_TOKEN', 'User for this session no longer exists.'));
  if (user.status === 'DISABLED') return next(new ApiError(403, 'ACCOUNT_DISABLED', 'This account has been disabled by an administrator.'));
  if (user.status === 'LOCKED') return next(new ApiError(403, 'ACCOUNT_LOCKED', 'This account is locked.'));
  // sliding expiration
  const ttl = session.remember_me ? REMEMBER_TTL_MS : SESSION_TTL_MS;
  run('UPDATE sessions SET expires_at = ? WHERE id = ?', new Date(Date.now() + ttl).toISOString(), token);
  req.user = { userId: user.id, username: user.username, role: user.role, customerId: user.customer_id, sessionId: token };
  next();
}

export function requireRole(role: 'ADMIN' | 'CUSTOMER') {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return next(new ApiError(403, 'FORBIDDEN', `This action requires the ${role} role.`));
    }
    next();
  };
}

/** Customer-only routes: admins don't own accounts. */
export function customerId(req: Request): string {
  if (!req.user?.customerId) throw new ApiError(403, 'FORBIDDEN', 'This endpoint is only available to customer users.');
  return req.user.customerId;
}
