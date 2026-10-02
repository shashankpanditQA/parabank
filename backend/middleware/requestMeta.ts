import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

/** Adds X-Request-Id and X-Response-Time headers to every API response. */
export function requestMeta(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  const requestId = `REQ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Powered-By', 'ParaBank Pro API');
  const originalWriteHead = res.writeHead;
  (res as any).writeHead = function (...args: any[]) {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    if (!res.headersSent) res.setHeader('X-Response-Time', `${ms.toFixed(1)}ms`);
    return (originalWriteHead as any).apply(this, args);
  };
  next();
}
