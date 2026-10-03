import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { DBHelper, DomainRepository, SupabaseConnection, loadDbConfig } from '../DB';
import { AuthService } from './auth/authService';
import { createMailer } from './auth/email';
import { ensureAuthSchema } from './authSchema';
import { loadApiConfig } from './config';
import { ensureDomainSchema } from './domainSchema';
import { errorHandler } from './middleware/errors';
import { rateLimit } from './middleware/rateLimit';
import { requireAdmin, sessionLoader } from './middleware/session';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { driverRoutes } from './routes/driver';
import { registryRoutes } from './routes/registry';
import { reservationsRoutes } from './routes/reservations';
import { customerRoutes } from './routes/customer';
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
  await ensureDomainSchema(conn);
  console.log('Domain schema up to date (driver.vehicle_id, …)');

  const db = new DBHelper(conn);
  const repo = new DomainRepository(db);
  const mailer = createMailer(cfg);
  const auth = new AuthService(db, repo, cfg, mailer);

  console.log(`Mode: ${cfg.isProduction ? 'PRODUCTION' : 'development'}`);
  if (cfg.otpDevMode && !cfg.isProduction) {
    console.warn('⚠ SMTP non configuré — mode dev : les codes 2FA sont loggués ici et renvoyés en `dev_code`');
  }
  if (cfg.otpDevMode && cfg.isProduction) {
    console.warn(
      '⚠ PRODUCTION sans SMTP configuré — les emails de connexion (2FA) ne seront PAS envoyés tant que SMTP_* ' +
        "n'est pas renseigné dans backend/.env. L'inscription/connexion restera bloquée à l'étape du code jusque-là.",
    );
  }
  if (cfg.isProduction && !cfg.corsOrigin) {
    console.log('CORS: aucune origine cross-site explicite (CORS_ORIGIN) — seules les requêtes same-origin (via le proxy du frontend) sont autorisées.');
  }
  if (cfg.isProduction && !cfg.cookieSecure) {
    console.warn('⚠ PRODUCTION avec COOKIE_SECURE=false — les cookies de session ne seront pas marqués "secure". À utiliser uniquement derrière HTTPS.');
  }

  const app = express();
  app.set('trust proxy', true);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  // In production, only reflect an explicitly configured origin (credentialed
  // cross-site requests otherwise stay disallowed). In dev, reflect any origin
  // for convenience. Same-origin calls (through the frontend's dev/preview
  // proxy) never need CORS at all.
  app.use(cors({ origin: cfg.corsOrigin ?? (cfg.isProduction ? false : true), credentials: true }));
  app.use(rateLimit({ windowMs: 60_000, max: 240 }));

  app.use(sessionLoader(auth, cfg.cookieName));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'wassalni-api', db: dbInfo });
  });

  const authLimiter = rateLimit({ windowMs: 60_000, max: 15, message: "Trop de tentatives d'authentification — patientez une minute" });
  app.use('/api/auth', authLimiter, authRoutes(auth, cfg));
  app.use('/api/registry', registryRoutes(db, repo));
  app.use('/api/trips', tripsRoutes(db, repo));
  app.use('/api/reservations', reservationsRoutes(db, repo));
  app.use('/api/customer', customerRoutes(repo));
  app.use('/api/driver', driverRoutes(db, repo));
  app.use('/api/admin', requireAdmin, adminRoutes(db, repo, auth));

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
