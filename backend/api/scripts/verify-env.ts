/**
 * verify-env.ts — Task 20.4: environment verification, as a standalone
 * pre-deploy gate (separate from the lenient, non-fatal startup warnings
 * api/server.ts already prints — those exist so local dev never gets
 * blocked; this script is the opposite: it's meant to run in CI/CD or by
 * an operator *before* a production deploy and exit non-zero on anything
 * that would make the deployed service unsafe or non-functional).
 *
 * Run with: npm run verify:env
 * (reads backend/.env via the same loadBackendEnv()/loadApiConfig() every
 * other entry point uses — no separate config surface to keep in sync.)
 */
import { loadDbConfig } from '../../DB/config';
import { loadApiConfig } from '../config';

interface Check {
  name: string;
  /** true = pass. In production, a failing check here is fatal (exit 1); outside production it's only a warning. */
  pass: boolean;
  detail: string;
  /** Checks that are unsafe in ANY environment (not just production), e.g. a clearly-default secret. */
  alwaysFatal?: boolean;
}

function main(): void {
  const cfg = loadApiConfig();
  const dbCfg = loadDbConfig();
  const checks: Check[] = [];

  // ── Database ────────────────────────────────────────────────────────────
  checks.push({
    name: 'database_configured',
    pass: !!(dbCfg.databaseUrl || dbCfg.supabaseAccessToken),
    detail: dbCfg.databaseUrl
      ? 'Direct Postgres connection string (DATABASE_URL) configured'
      : dbCfg.supabaseAccessToken
        ? 'Supabase Management API token configured'
        : 'Neither DATABASE_URL nor SUPABASE_ACCESS_TOKEN is set',
  });

  // ── Session / cookies ──────────────────────────────────────────────────
  checks.push({
    name: 'cookie_secure_in_production',
    pass: !cfg.isProduction || cfg.cookieSecure,
    detail: cfg.isProduction
      ? cfg.cookieSecure
        ? 'COOKIE_SECURE is on'
        : 'COOKIE_SECURE=false in production — session cookies will not be marked Secure (requires HTTPS to be meaningful)'
      : '(not production — skipped)',
  });
  checks.push({
    name: 'cors_origin_explicit_in_production',
    pass: !cfg.isProduction || !!cfg.corsOrigin,
    detail: cfg.isProduction
      ? cfg.corsOrigin
        ? `CORS_ORIGIN=${cfg.corsOrigin}`
        : 'CORS_ORIGIN not set — only same-origin requests will be allowed (fine if the frontend is served same-origin/proxied; otherwise cross-site calls will fail)'
      : '(not production — skipped)',
  });

  // ── Real-world delivery channels (at least one must work in production) ──
  const hasRealEmail = !cfg.otpDevMode;
  const hasRealSms = !!cfg.sms.provider;
  checks.push({
    name: 'at_least_one_otp_channel_in_production',
    pass: !cfg.isProduction || hasRealEmail || hasRealSms,
    detail:
      hasRealEmail || hasRealSms
        ? `email=${hasRealEmail ? 'SMTP configured' : 'dev-console only'}, sms=${hasRealSms ? cfg.sms.provider : 'sandbox only'}`
        : 'Neither SMTP_HOST nor SMS_PROVIDER is set — in production, 2FA login codes would never actually reach a user',
  });

  // ── Push ────────────────────────────────────────────────────────────────
  checks.push({
    name: 'vapid_keys_persisted_in_production',
    pass: !cfg.isProduction || !cfg.vapidIsEphemeral,
    detail: cfg.vapidIsEphemeral
      ? 'VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — an ephemeral keypair is generated per-process; every push subscription breaks on every restart'
      : 'VAPID keys configured',
  });

  // ── Backups (Phase 18) ─────────────────────────────────────────────────
  checks.push({
    name: 'backup_scheduler_enabled_in_production',
    pass: !cfg.isProduction || cfg.backup.enabled,
    detail: cfg.backup.enabled
      ? `enabled, ${cfg.backup.retentionDays}-day retention`
      : 'BACKUP_SCHEDULER_ENABLED=false — nothing else in this repo is taking nightly backups; see backend/BACKUP_RECOVERY.md',
  });

  // ── Mock payment gateway honesty check — Task 7.1/7.2 explicit decision ──
  checks.push({
    name: 'payment_gateway_is_mock_by_design',
    pass: true,
    detail: 'Payments run against the built-in mock/sandbox gateway (no real processor integrated) — this is an accepted product decision, not a misconfiguration; see backend/api/payments/mockGateway.ts.',
  });

  const failures = checks.filter((c) => !c.pass);
  const fatalFailures = failures.filter((c) => cfg.isProduction || c.alwaysFatal);

  console.log(`Environment verification — mode: ${cfg.isProduction ? 'PRODUCTION' : 'development'}\n`);
  for (const c of checks) {
    const icon = c.pass ? '✓' : cfg.isProduction || c.alwaysFatal ? '✗' : '⚠';
    console.log(`${icon} ${c.name}: ${c.detail}`);
  }
  console.log(`\n${checks.length - failures.length}/${checks.length} checks passed.`);

  if (fatalFailures.length > 0) {
    console.error(`\n${fatalFailures.length} fatal check(s) failed for a production deploy — fix backend/.env before deploying.`);
    process.exit(1);
  }
  if (failures.length > 0) {
    console.warn(`\n${failures.length} check(s) would fail in production — fine for local development, not for a real deploy.`);
  }
  process.exit(0);
}

main();
