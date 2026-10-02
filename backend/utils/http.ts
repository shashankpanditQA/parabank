import type { Request, Response, NextFunction, RequestHandler } from 'express';

export class ApiError extends Error {
  constructor(
    public status: number,
    public errorCode: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const badRequest = (code: string, msg: string, details?: Record<string, unknown>) =>
  new ApiError(400, code, msg, details);
export const notFound = (code: string, msg: string) => new ApiError(404, code, msg);
export const conflict = (code: string, msg: string, details?: Record<string, unknown>) =>
  new ApiError(409, code, msg, details);
export const unprocessable = (code: string, msg: string, details?: Record<string, unknown>) =>
  new ApiError(422, code, msg, details);

/** Wrap async handlers so thrown errors reach the error middleware. */
export const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => any): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/** Collects field validation errors and throws a single VALIDATION_ERROR. */
export function validate(rules: Array<[boolean, string, string]>) {
  const fieldErrors: Record<string, string> = {};
  for (const [failed, field, message] of rules) {
    if (failed && !fieldErrors[field]) fieldErrors[field] = message;
  }
  if (Object.keys(fieldErrors).length) {
    throw new ApiError(400, 'VALIDATION_ERROR', Object.values(fieldErrors)[0], { fieldErrors });
  }
}

export interface Paged<T> {
  success: true;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function paginate<T>(rows: T[], pageRaw: unknown, sizeRaw: unknown, defaultSize = 10): Paged<T> {
  const pageSize = Math.min(Math.max(parseInt(String(sizeRaw ?? defaultSize), 10) || defaultSize, 1), 100);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(parseInt(String(pageRaw ?? 1), 10) || 1, 1), totalPages);
  return {
    success: true,
    data: rows.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, pageSize, total, totalPages },
  };
}

export function sortRows<T extends Record<string, any>>(rows: T[], sortBy: unknown, order: unknown, allowed: string[]): T[] {
  const key = typeof sortBy === 'string' && allowed.includes(sortBy) ? sortBy : null;
  if (!key) return rows;
  const dir = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
  });
}

export const str = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
export const num = (v: unknown) => (v === '' || v == null ? NaN : Number(v));
