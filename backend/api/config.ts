import { loadBackendEnv } from '../DB/config';

/** Runtime configuration of the API server (all values from backend/.env). */
export interface ApiConfig {
  port: number;
  /** Session lifetime in hours. */
  sessionTtlHours: number;
  otpTtlMinutes: number;
  otpMaxAttempts: number;
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
  return {
    port: intEnv('PORT', 3000),
    sessionTtlHours: intEnv('SESSION_TTL_HOURS', 24 * 7),
    otpTtlMinutes: intEnv('OTP_TTL_MINUTES', 10),
    otpMaxAttempts: intEnv('OTP_MAX_ATTEMPTS', 5),
    maxFailedLogins: intEnv('MAX_FAILED_LOGINS', 5),
    lockMinutes: intEnv('LOCK_MINUTES', 15),
    cookieName: 'wassalni_sid',
    cookieSecure: process.env.COOKIE_SECURE === 'true' || (isProduction && process.env.COOKIE_SECURE !== 'false'),
    corsOrigin: process.env.CORS_ORIGIN?.trim() || undefined,
    isProduction,
    smtp,
    otpDevMode: !smtp.host,
  };
}
