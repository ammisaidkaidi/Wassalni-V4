import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { createBackup, listBackups, pruneOldBackups, restoreDrill, verifyBackup } from '../DB/backup';
import { DBHelper, DomainRepository, SupabaseConnection, loadDbConfig } from '../DB';
import { AuthService } from './auth/authService';
import { createMailer } from './auth/email';
import { ensureAuthSchema } from './authSchema';
import { loadApiConfig } from './config';
import { ensureDomainSchema } from './domainSchema';
import { detailedHealth, publicHealth, recordTick, registerScheduler } from './health';
import { errorHandler } from './middleware/errors';
import { rateLimit } from './middleware/rateLimit';
import { requestContext } from './middleware/requestId';
import { requireAdmin, requirePermission, sessionLoader } from './middleware/session';
import { log } from './logger';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { driverRoutes } from './routes/driver';
import { registryRoutes } from './routes/registry';
import { reservationsRoutes } from './routes/reservations';
import { customerRoutes } from './routes/customer';
import { paymentsRoutes } from './routes/payments';
import { tripsRoutes } from './routes/trips';
import { notificationsRoutes } from './routes/notifications';
import { pushRoutes } from './routes/push';
import { configurePushService, dispatchPendingPushNotifications } from './push';
import { createSmsSender } from './sms';
import { dispatchPendingSmsNotifications } from './smsDispatch';
import { shareRoutes } from './routes/share';

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
  const smsSender = createSmsSender(cfg);
  const auth = new AuthService(db, repo, cfg, mailer, smsSender);

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
  // Task 18.1/18.2 — backup & recovery (see backend/BACKUP_RECOVERY.md).
  // Fire-and-forget: a slow/unreachable Management API must never delay
  // startup — this is purely an informational heads-up in the logs.
  conn
    .getManagedBackupStatus()
    .then((r) => {
      if (!r.available) {
        console.warn(`⚠ Could not determine Supabase-managed backup/PITR status: ${r.reason}`);
      } else if (!r.status.pitrEnabled && r.status.backups.length === 0) {
        console.warn(
          '⚠ This Supabase project has NO managed backups and NO PITR enabled. Our own nightly logical backup ' +
            '(see below) is the only safety net until this is addressed — see backend/BACKUP_RECOVERY.md.',
        );
      }
    })
    .catch(() => undefined);
  if (!cfg.backup.enabled) {
    console.warn('⚠ BACKUP_SCHEDULER_ENABLED=false — automatic nightly logical backups are OFF. Only manual `npm run db -- backup:run` / an external backup system cover this project.');
  }
  // Task 17.1/17.2 — SMS (notifications + 2FA alternative).
  if (smsSender.mode === 'sandbox' && !cfg.isProduction) {
    console.warn('⚠ SMS_PROVIDER non configuré — mode sandbox : les SMS sont loggués ici et journalisés dans sms_log, jamais livrés à un vrai téléphone.');
  }
  if (smsSender.mode === 'sandbox' && cfg.isProduction) {
    console.warn(
      '⚠ PRODUCTION sans SMS_PROVIDER configuré — aucun SMS (notifications ou 2FA) ne sera réellement livré ; ' +
        'le canal SMS du 2FA est automatiquement désactivé (voir AuthService.smsChannelAvailable) tant que cette variable n’est pas renseignée dans backend/.env.',
    );
  }
  // Task 16.2 — Web Push.
  configurePushService(cfg);
  if (cfg.vapidIsEphemeral && !cfg.isProduction) {
    console.warn('⚠ VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY non configurés — clé générée pour ce process uniquement : les abonnements push ne survivront pas à un redémarrage.');
  }
  if (cfg.vapidIsEphemeral && cfg.isProduction) {
    console.warn(
      '⚠ PRODUCTION sans VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY configurés — une paire de clés éphémère a été générée. ' +
        'Chaque redémarrage invalidera tous les abonnements push existants tant que ces variables ne sont pas fixées dans backend/.env.',
    );
  }

  const app = express();
  app.set('trust proxy', true);
  app.disable('x-powered-by');
  // `verify` stashes the exact raw bytes alongside the parsed body so the
  // mock payment gateway's webhook route (Task 7.2) can recompute an HMAC
  // signature over precisely what was received — without needing a
  // separate raw-body-only parser/route ordering trick.
  app.use(
    express.json({
      limit: '256kb',
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      },
    }),
  );
  app.use(cookieParser());
  // In production, only reflect an explicitly configured origin (credentialed
  // cross-site requests otherwise stay disallowed). In dev, reflect any origin
  // for convenience. Same-origin calls (through the frontend's dev/preview
  // proxy) never need CORS at all.
  app.use(cors({ origin: cfg.corsOrigin ?? (cfg.isProduction ? false : true), credentials: true }));
  app.use(rateLimit({ windowMs: 60_000, max: 240 }));

  // Task 20.2 — request id + structured access log for every request from here on.
  app.use(requestContext);

  app.use(sessionLoader(auth, cfg.cookieName));

  app.get('/api/health', (_req, res) => {
    publicHealth(db)
      .then((h) => res.status(h.ok ? 200 : 503).json({ service: 'wassalni-api', ...h }))
      .catch(() => res.status(503).json({ service: 'wassalni-api', ok: false, db: false, uptime_s: Math.round(process.uptime()) }));
  });

  // Task 20.3 — detailed health (DB latency, scheduler staleness, provider
  // modes). Admin-only: unlike /api/health above this exposes operational
  // detail that has no business being public.
  app.get('/api/admin/health', requireAdmin, requirePermission('view'), (_req, res) => {
    detailedHealth(db, cfg)
      .then((h) => res.status(h.ok ? 200 : 503).json(h))
      .catch((err) => res.status(500).json({ error: { code: 'INTERNAL', message: String(err) } }));
  });

  const authLimiter = rateLimit({ windowMs: 60_000, max: 15, message: "Trop de tentatives d'authentification — patientez une minute" });
  app.use('/api/auth', authLimiter, authRoutes(auth, cfg));
  app.use('/api/registry', registryRoutes(db, repo));
  app.use('/api/trips', tripsRoutes(db, repo));
  app.use('/api/reservations', reservationsRoutes(db, repo));
  app.use('/api/customer', customerRoutes(repo));
  app.use('/api/driver', driverRoutes(db, repo));
  app.use('/api/admin', requireAdmin, adminRoutes(db, repo, auth));
  // Shared inbox across every role (Task 11.1) — gated only by requireAuth
  // inside the route module itself, not by a specific role.
  app.use('/api/notifications', notificationsRoutes(repo));
  // Task 16.2 — Web Push subscription management (same "any signed-in role" gating as the inbox above).
  app.use('/api/push', pushRoutes(repo, cfg));
  // Public (no auth at all) live-trip tracking link (Task 11.4) — anyone
  // holding the opaque, hashed token can view it, by design.
  app.use('/api/share', shareRoutes(repo));
  // Public (unauthenticated) — this is where an external gateway's hosted
  // checkout page and webhook delivery would land; neither carries our own
  // session cookies, so each route authenticates itself via its own opaque
  // transaction id / signature instead (same posture a real gateway has).
  app.use('/api/payments', paymentsRoutes(db, repo, cfg.port));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route inconnue' } });
  });
  app.use(errorHandler);

  const server = app.listen(cfg.port, '0.0.0.0', () => {
    console.log(`🚀 Wassalni API listening on http://0.0.0.0:${cfg.port}`);
    log.info('server.started', { port: cfg.port, mode: cfg.isProduction ? 'production' : 'development' });
  });

  // Task 7.3 — periodic sweep of pending gateway payment intents whose
  // 15-minute window lapsed without the customer completing checkout (or
  // the webhook never arriving). Mirrors the no-show-strike interval
  // pattern already used elsewhere in this file's sibling services; errors
  // are logged, not fatal, so a single bad tick never takes the API down.
  const expiryIntervalMs = 60_000;
  registerScheduler('payment_expiry', expiryIntervalMs);
  const expiryTimer = setInterval(() => {
    repo
      .expireStalePaymentIntents()
      .then((n) => {
        if (n > 0) console.log(`⏱ Payment intents expired: ${n}`);
        recordTick('payment_expiry', { ok: true });
      })
      .catch((err) => {
        console.error('✗ expire_stale_payment_intents failed:', err);
        recordTick('payment_expiry', { ok: false, error: String(err) });
      });
  }, expiryIntervalMs);
  expiryTimer.unref();

  // Task 13.1 — trip lifecycle scheduler: flips trips through
  // scheduled → boarding → in_progress → completed on their own departure/
  // arrival timestamps, and raises the reminder/boarding notifications that
  // go with each transition. Same unref'd-interval, log-don't-crash pattern
  // as the payment-intent sweep above; an admin can also force an
  // out-of-band tick via POST /api/admin/scheduler/run-trip-lifecycle-tick.
  const lifecycleIntervalMs = 60_000;
  registerScheduler('trip_lifecycle', lifecycleIntervalMs);
  const lifecycleTimer = setInterval(() => {
    repo
      .runTripLifecycleTick()
      .then((r) => {
        const total = Object.values(r).reduce((a, b) => a + b, 0);
        if (total > 0) console.log('⏱ Trip lifecycle tick:', r);
        recordTick('trip_lifecycle', { ok: true });
      })
      .catch((err) => {
        console.error('✗ run_trip_lifecycle_tick failed:', err);
        recordTick('trip_lifecycle', { ok: false, error: String(err) });
      });
  }, lifecycleIntervalMs);
  lifecycleTimer.unref();

  // Task 16.2 — Web Push dispatcher: sweeps notifications no browser
  // subscription has been pushed for yet. Same log-don't-crash,
  // unref'd-interval pattern as the two tickers above; a single failed
  // delivery (stale subscription, push service hiccup) never blocks the
  // others, see api/push.ts.
  const pushIntervalMs = 20_000;
  registerScheduler('push_dispatch', pushIntervalMs);
  const pushTimer = setInterval(() => {
    dispatchPendingPushNotifications(repo)
      .then((r) => {
        if (r.notifications > 0) console.log(`⏱ Push dispatch: ${r.sent} sent, ${r.pruned} stale subscriptions pruned, ${r.notifications} notifications processed`);
        recordTick('push_dispatch', { ok: true });
      })
      .catch((err) => {
        console.error('✗ dispatchPendingPushNotifications failed:', err);
        recordTick('push_dispatch', { ok: false, error: String(err) });
      });
  }, pushIntervalMs);
  pushTimer.unref();

  // Task 17.1 — SMS notification dispatcher: same sweep pattern as the push
  // dispatcher above, over the same `notification` rows, restricted to the
  // booking/approval/cancellation/reminder/payment event types (see
  // api/smsDispatch.ts's SMS_NOTIFICATION_TYPES allow-list).
  const smsIntervalMs = 20_000;
  registerScheduler('sms_dispatch', smsIntervalMs);
  const smsTimer = setInterval(() => {
    dispatchPendingSmsNotifications(repo, db, smsSender)
      .then((r) => {
        if (r.notifications > 0) {
          console.log(`⏱ SMS dispatch: ${r.sent} sent, ${r.failed} failed, ${r.skippedNoPhone} skipped (no phone), ${r.notifications} notifications processed`);
        }
        recordTick('sms_dispatch', { ok: true });
      })
      .catch((err) => {
        console.error('✗ dispatchPendingSmsNotifications failed:', err);
        recordTick('sms_dispatch', { ok: false, error: String(err) });
      });
  }, smsIntervalMs);
  smsTimer.unref();

  // Task 18.1 — nightly logical backup + self-verification + retention
  // pruning. Same log-don't-crash, unref'd-interval pattern as the tickers
  // above. A fresh backup is immediately verified (checksum + structural
  // self-consistency + live row-count drift) so a silently-broken backup
  // never goes unnoticed until the day it's actually needed.
  let backupTimer: ReturnType<typeof setInterval> | undefined;
  if (cfg.backup.enabled) {
    const backupIntervalMs = 24 * 60 * 60_000;
    registerScheduler('backup', backupIntervalMs);
    const runBackupTick = (): void => {
      createBackup(db)
        .then(async (manifest) => {
          const verify = await verifyBackup(manifest.id, db);
          const pruned = pruneOldBackups(cfg.backup.retentionDays);
          console.log(
            `⏱ Backup: ${manifest.id} created (${manifest.tables.length} tables) — verify ${verify.ok ? 'OK' : 'FAILED: ' + verify.issues.join('; ')} — pruned ${pruned.length} old backup(s)`,
          );
          if (!verify.ok) console.error('✗ Freshly-created backup failed verification — investigate immediately:', verify.issues);
          recordTick('backup', verify.ok ? { ok: true } : { ok: false, error: verify.issues.join('; ') });
        })
        .catch((err) => {
          console.error('✗ Scheduled backup failed:', err);
          recordTick('backup', { ok: false, error: String(err) });
        });
    };
    backupTimer = setInterval(runBackupTick, backupIntervalMs);
    backupTimer.unref();
  }

  // Task 18.1 — weekly restore-drill: the real proof a backup is loadable,
  // not just present on disk. Heavier than a plain verify (round-trips
  // every row through a real CREATE TABLE + INSERT), so it runs far less
  // often; always targets the isolated 'backup_drill' schema and cleans up
  // after itself regardless of outcome (see DB/backup.ts).
  let restoreDrillTimer: ReturnType<typeof setInterval> | undefined;
  if (cfg.backup.enabled) {
    const restoreDrillIntervalMs = 7 * 24 * 60 * 60_000;
    registerScheduler('restore_drill', restoreDrillIntervalMs);
    const runRestoreDrillTick = (): void => {
      const latest = listBackups()[0];
      if (!latest) return;
      restoreDrill(db, latest.id)
        .then((result) => {
          console.log(`⏱ Restore drill: ${latest.id} → ${result.ok ? 'OK' : 'FAILED: ' + result.issues.join('; ')} (${result.durationMs}ms)`);
          if (!result.ok) console.error('✗ Restore drill failed — the latest backup may not actually be restorable:', result.issues);
          recordTick('restore_drill', result.ok ? { ok: true } : { ok: false, error: result.issues.join('; ') });
        })
        .catch((err) => {
          console.error('✗ Scheduled restore drill failed:', err);
          recordTick('restore_drill', { ok: false, error: String(err) });
        });
    };
    restoreDrillTimer = setInterval(runRestoreDrillTick, restoreDrillIntervalMs);
    restoreDrillTimer.unref();
  }

  const shutdown = (): void => {
    console.log('Shutting down…');
    clearInterval(expiryTimer);
    clearInterval(lifecycleTimer);
    clearInterval(pushTimer);
    clearInterval(smsTimer);
    if (backupTimer) clearInterval(backupTimer);
    if (restoreDrillTimer) clearInterval(restoreDrillTimer);
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
