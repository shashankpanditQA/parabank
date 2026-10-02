import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { api } from './routes/index.js';
import { requestMeta } from './middleware/requestMeta.js';
import { simulation } from './middleware/simulation.js';
import { errorHandler, notFoundApi } from './middleware/errorHandler.js';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'backend', 'public');
const WEB_DIR = path.join(ROOT, 'dist', 'public');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.set('json spaces', 2);

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ---------------- REST API
  app.use('/api', requestMeta, (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  }, simulation, api, notFoundApi);

  // ---------------- Real HTML pages used for iframes and popups (no React, no tricks)
  const page = (file: string) => (_req: express.Request, res: express.Response) => res.sendFile(path.join(PUBLIC_DIR, file));
  app.get('/payment-gateway', page('gateway/payment-gateway.html'));
  app.get('/payment-gateway/otp', page('gateway/otp.html'));
  app.get('/payment-gateway/checkout', page('gateway/checkout.html'));
  app.use('/popups', express.static(path.join(PUBLIC_DIR, 'popups'), { extensions: ['html'] }));
  app.use('/lab-pages', express.static(path.join(PUBLIC_DIR, 'lab-pages'), { extensions: ['html'] }));
  app.use('/sample-files', express.static(path.join(ROOT, 'sample-files')));

  // ---------------- React SPA (production build)
  if (fs.existsSync(WEB_DIR)) {
    app.use(express.static(WEB_DIR, { index: false }));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(WEB_DIR, 'index.html')));
  } else {
    app.get('/', (_req, res) =>
      res.type('html').send('<h1>ParaBank Pro API</h1><p>Frontend not built. Run <code>npm run dev</code> (web on :5173) or <code>npm run build</code>.</p>'),
    );
  }

  app.use(errorHandler);
  return app;
}
