import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ApiError } from '../utils/http.js';

export function notFoundApi(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, 'ENDPOINT_NOT_FOUND', `No API endpoint matches ${req.method} ${req.originalUrl.split('?')[0]}`));
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;
  if (err instanceof ApiError) {
    return res.status(err.status).json({ success: false, errorCode: err.errorCode, message: err.message, ...(err.details ?? {}) });
  }
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({
      success: false,
      errorCode: tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR',
      message: tooBig ? 'File exceeds the 5 MB limit.' : err.message,
    });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, errorCode: 'INVALID_JSON', message: 'Request body is not valid JSON.' });
  }
  console.error(err);
  res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' });
}
