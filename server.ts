import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { initializeSeedData } from './server/db.ts';
import { createApiRouter } from './server/routes.ts';
import { assertSessionSecretConfig } from './server/security.ts';

async function startServer() {
  assertSessionSecretConfig();
  await initializeSeedData();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', process.env.TRUST_PROXY || false);
  app.use(express.json({ limit: '2mb' }));

  const apiRouter = createApiRouter();

  // Also map /uploads/* directly for convenience alongside /api/uploads/*
  app.use('/uploads', (req, res, next) => {
    req.url = `/uploads${req.url}`;
    apiRouter(req, res, next);
  });

  app.use('/api', apiRouter);

  // Global error handler
  app.use((err: Error & { status?: number; code?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const isUploadError = err.name === 'MulterError';
    const status = err.status === 413 || err.code === 'LIMIT_FILE_SIZE' ? 413 : isUploadError || err.status === 400 ? 400 : 500;
    if (status === 500) console.error('[NusaKlik Server Error]', err.message);
    res.status(status).json({
      error: status === 413
        ? 'Ukuran unggahan melebihi batas yang diizinkan.'
        : status === 400
          ? 'Permintaan atau berkas unggahan tidak valid.'
          : 'Terjadi kesalahan pada server. Silakan coba kembali.',
    });
  });

  const rootDir = process.cwd();
  const distDir = path.join(rootDir, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    // Serve public/assets cleanly in dev
    app.use(express.static(path.join(rootDir, 'public')));
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`NusaKlik server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NusaKlik server:', err);
  process.exit(1);
});
