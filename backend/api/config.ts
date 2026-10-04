import webpush from 'web-push';
import { loadBackendEnv } from '../DB/config';

/** Runtime configuration of the API server (all values from backend/.env). */
export interface ApiConfig {
  port: number;
  /** Session lifetime in hours. */
  sessionTtlHours: number;
  otpTtlMinutes: number;
  otpMaxAttempts: number;
  /** Task 14.3 — minimum delay before a pending login challenge may be re-sent (anti-OTP-bombing). */
  otpResendCooldownSeconds: number;
  maxFailedLogins: number;
  lockMinutes: number;
  cookieName: string;
  cookieSecure: boolean;
  corsOrigin: string | undefined;
  isProduction: boolean;
  smtp: { host?: string; port: number; user?: string; pass?: string; from: string };
  /** When no SMTP is configured: OTP codes are logged to the console and
   *  returned as `dev_code` in the login response (development only!). */
  otpDevMode: boolean;
  /** Task 16.2 — Web Push (VAPID) keypair + contact subject used to sign
   *  every push message sent to a browser's push service. */
  vapid: { publicKey: string; privateKey: string; subject: string };
  /** True when VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY were not set and an
   *  ephemeral keypair was generated for this process only — every
   *  previously stored browser subscription becomes invalid on restart, so
   *  this must never be true in production. */
  vapidIsEphemeral: boolean;
}

function intEnv(name: string, def: number): number {
  const v = process.env[name];
  if (v === undefined || v.trim() === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export function loadApiConfig(): ApiConfig {
  loadBackendEnv();
  const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';
  const smtp = {
    host: process.env.SMTP_HOST?.trim() || undefined,
    port: intEnv('SMTP_PORT', 587),
    user: process.env.SMTP_USER?.trim() || undefined,
    pass: process.env.SMTP_PASS ?? undefined,
    from: process.env.SMTP_FROM?.trim() || 'Wassalni <no-reply@wassalni.dz>',
  };
  const envVapidPublic = process.env.VAPID_PUBLIC_KEY?.trim();
  const envVapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
  const vapidIsEphemeral = !envVapidPublic || !envVapidPrivate;
  // Dev convenience only (mirrors otpDevMode below): without a configured
  // keypair, generate one for this process so push still works locally,
  // but it changes on every restart — every subscription stored against
  // the previous key becomes invalid, which is why this must be set
  // explicitly (and kept stable) in production.
  const generated = vapidIsEphemeral ? webpush.generateVAPIDKeys() : null;
  const vapid = {
    publicKey: envVapidPublic || generated!.publicKey,
    privateKey: envVapidPrivate || generated!.privateKey,
    subject: process.env.VAPID_SUBJECT?.trim() || 'mailto:support@wassalni.dz',
  };
  return {
    port: intEnv('PORT', 3000),
    sessionTtlHours: intEnv('SESSION_TTL_HOURS', 24 * 7),
    otpTtlMinutes: intEnv('OTP_TTL_MINUTES', 10),
    otpMaxAttempts: intEnv('OTP_MAX_ATTEMPTS', 5),
    otpResendCooldownSeconds: intEnv('OTP_RESEND_COOLDOWN_SECONDS', 30),
    maxFailedLogins: intEnv('MAX_FAILED_LOGINS', 5),
    lockMinutes: intEnv('LOCK_MINUTES', 15),
    cookieName: 'wassalni_sid',
    cookieSecure: process.env.COOKIE_SECURE === 'true' || (isProduction && process.env.COOKIE_SECURE !== 'false'),
    corsOrigin: process.env.CORS_ORIGIN?.trim() || undefined,
    isProduction,
    smtp,
    otpDevMode: !smtp.host,
    vapid,
    vapidIsEphemeral,
  };
}
