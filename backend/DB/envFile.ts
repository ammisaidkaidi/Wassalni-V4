import * as fs from 'node:fs';
import * as path from 'node:path';
import { BACKEND_ROOT } from './config';
import type { DbConfig } from './config';

const ENV_PATH = path.join(BACKEND_ROOT, '.env');

/**
 * Keys the `/api/init-db` endpoints are allowed to read or write — a
 * deliberate allow-list, not a generic "edit any env var" tool. Covers the
 * DB connection transport plus the handful of other settings that matter
 * for a fresh/broken deployment to come back up (CORS, cookies, SMTP, and
 * the init-db tool's own login).
 */
export const INIT_DB_MANAGED_KEYS = [
  'DATABASE_URL',
  'SUPABASE_PROJECT_REF',
  'SUPABASE_ACCESS_TOKEN',
  'CORS_ORIGIN',
  'COOKIE_SECURE',
  'PORT',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'INIT_DB_USERNAME',
  'INIT_DB_PASSWORD',
] as const;
export type InitDbKey = (typeof INIT_DB_MANAGED_KEYS)[number];

const SECRET_KEY_PATTERN = /PASSWORD|TOKEN|SECRET|^SMTP_PASS$/i;

function parseLine(line: string): { key: string; value: string } | null {
  const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (!m) return null;
  let value = m[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key: m[1], value };
}

/**
 * Read backend/.env fresh from disk on every call — deliberately bypasses
 * `process.env` (which a long-running process only populates once at boot
 * and never un-sets) so the init-db UI always reflects the file's true
 * current contents, even before the server has restarted/reconnected.
 */
export function readEnvFile(): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(ENV_PATH)) return out;
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const parsed = parseLine(line);
    if (parsed) out[parsed.key] = parsed.value;
  }
  return out;
}

/**
 * Merge `updates` into backend/.env: existing active `KEY=value` lines are
 * rewritten in place (comments and every other line are left byte-for-byte
 * untouched); brand-new keys are appended under a managed marker section.
 * Callers are responsible for only passing keys from INIT_DB_MANAGED_KEYS.
 */
export function writeEnvFile(updates: Record<string, string>): void {
  const existing = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const lines = existing.length ? existing.split(/\r?\n/) : [];
  const remaining = new Map(Object.entries(updates));
  const nextLines = lines.map((line) => {
    const parsed = parseLine(line);
    if (parsed && remaining.has(parsed.key)) {
      const value = remaining.get(parsed.key)!;
      remaining.delete(parsed.key);
      return `${parsed.key}=${value}`;
    }
    return line;
  });
  if (remaining.size > 0) {
    if (nextLines.length && nextLines[nextLines.length - 1].trim() !== '') nextLines.push('');
    nextLines.push('# ── Updated via /api/init-db ────────────────────────────────────────────────');
    for (const [key, value] of remaining) nextLines.push(`${key}=${value}`);
  }
  fs.writeFileSync(ENV_PATH, nextLines.join('\n'));
}

/** Mask a secret-ish value for display (never send raw secrets back to the browser). */
export function maskValue(key: string, value: string): string {
  if (!value) return value;
  if (key === 'DATABASE_URL') {
    try {
      const u = new URL(value);
      if (u.password) u.password = '••••••••';
      return u.toString();
    } catch {
      return '••••••••';
    }
  }
  if (SECRET_KEY_PATTERN.test(key)) {
    return value.length <= 8 ? '••••••••' : `${value.slice(0, 4)}…${value.slice(-4)}`;
  }
  return value;
}

/** Build a DbConfig purely from the file's current contents (+ optional
 *  transient overrides for "test before you save" flows) — independent of
 *  `process.env` / `loadDbConfig()`, which only reflect what was true at
 *  process boot. */
export function dbConfigFromFile(
  overrides: Partial<Pick<DbConfig, 'databaseUrl' | 'supabaseAccessToken' | 'supabaseProjectRef'>> = {},
): DbConfig {
  const env = readEnvFile();
  return {
    databaseUrl: overrides.databaseUrl || env.DATABASE_URL || undefined,
    supabaseAccessToken: overrides.supabaseAccessToken || env.SUPABASE_ACCESS_TOKEN || undefined,
    supabaseProjectRef: overrides.supabaseProjectRef || env.SUPABASE_PROJECT_REF || undefined,
    sqlPath: path.join(BACKEND_ROOT, 'data', 'init', 'sql.txt'),
    algeriaDataPath: path.join(BACKEND_ROOT, 'data', 'init', 'algeria.txt'),
  };
}
