import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { DBHelper, DomainRepository, SupabaseConnection, loadDbConfig } from '../DB';
import { AuthService } from './auth/authService';
import { createMailer } from './auth/email';
import { ensureAuthSchema } from './authSchema';
import { loadApiConfig } from './config';
import { errorHandler } from './middleware/errors';
import { rateLimit } from './middleware/rateLimit';
import { requireAdmin, sessionLoader } from './middleware/session';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { registryRoutes } from './routes/registry';
import { reservationsRoutes } from './routes/reservations';
import { tripsRoutes } from './routes/trips';

async function main(): Promise<void> {
  const cfg = loadApiConfig();

  // Database (existing data layer — direct Postgres or Management API)
  const conn = new SupabaseConnection(loadDbConfig());
  await conn.init();
  const dbInfo = conn.describe();
  console.log(`DB: ${dbInfo.mode} → ${dbInfo.target}`);
  await ensureAuthSchema(conn);
  console.log('Auth schema ready (app_user / app_user_otp / app_session)');

  const db = new DBHelper(conn);
  const repo = new DomainRepository(db);
  const mailer = createMailer(cfg);
  const auth = new AuthService(db, repo, cfg, mailer);
  if (cfg.otpDevMode) {
    console.warn('⚠ SMTP non configuré — mode dev : les codes 2FA sont loggués ici et renvoyés en `dev_code`');
  }

  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  app.use(cors({ origin: cfg.corsOrigin ?? true, credentials: true }));
  app.use(rateLimit({ windowMs: 60_000, max: 240 }));

  app.use(sessionLoader(auth, cfg.cookieName));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'wassalni-api', db: dbInfo });
  });

  const authLimiter = rateLimit({ windowMs: 60_000, max: 15, message: "Trop de tentatives d'authentification — patientez une minute" });
  app.use('/api/auth', authLimiter, authRoutes(auth, cfg));
  app.use('/api/registry', registryRoutes(db));
  app.use('/api/trips', tripsRoutes(db));
  app.use('/api/reservations', reservationsRoutes(db, repo));
  app.use('/api/admin', requireAdmin, adminRoutes(db, repo));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route inconnue' } });
  });
  app.use(errorHandler);

  const server = app.listen(cfg.port, '0.0.0.0', () => {
    console.log(`🚀 Wassalni API listening on http://0.0.0.0:${cfg.port}`);
  });

  const shutdown = (): void => {
    console.log('Shutting down…');
    server.close(() => {
      conn.close().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('✗ Failed to start:', err);
  process.exit(1);
});
