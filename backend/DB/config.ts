import * as fs from 'node:fs';
import * as path from 'node:path';

/** Everything needed to reach the Supabase project + locate the init assets. */
export interface DbConfig {
  /** Direct Postgres connection string. When set, this transport is preferred. */
  databaseUrl?: string;
  /** Supabase personal access token (sbp_…) for the Management API fallback. */
  supabaseAccessToken?: string;
  /** Supabase project ref. Optional when the token has exactly one project. */
  supabaseProjectRef?: string;
  /** Path of the full DDL script (delivery_domain v3). */
  sqlPath: string;
  /** Path of the Algeria registry JSON payload. */
  algeriaDataPath: string;
}

/** backend/ root (config.ts lives in backend/DB/). */
export const BACKEND_ROOT = path.resolve(__dirname, '..');

/** Never print full secrets in logs — use this. */
export function maskSecret(secret?: string): string {
  if (!secret) return '(not set)';
  if (secret.length <= 8) return '****';
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}

/** Tiny .env loader (first file wins: .env.local over .env; real env vars win over both). */
export function loadBackendEnv(): void {
  for (const name of ['.env.local', '.env']) {
    const file = path.join(BACKEND_ROOT, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
  }
}

/**
 * Fallback: read the sbp_… access token from data/init/env.txt
 * (that file currently stores the token as free text).
 */
function tokenFromEnvTxt(): string | undefined {
  try {
    const content = fs.readFileSync(path.join(BACKEND_ROOT, 'data', 'init', 'env.txt'), 'utf8');
    return /sbp_[A-Za-z0-9]+/.exec(content)?.[0];
  } catch {
    return undefined;
  }
}

/** Resolve DB credentials & paths. Priority: overrides → env vars → .env file → env.txt. */
export function loadDbConfig(overrides: Partial<DbConfig> = {}): DbConfig {
  loadBackendEnv();
  const cfg: DbConfig = {
    databaseUrl: process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? undefined,
    supabaseAccessToken:
      process.env.SUPABASE_ACCESS_TOKEN ?? process.env.SUPABASE_TOKEN ?? tokenFromEnvTxt(),
    supabaseProjectRef: process.env.SUPABASE_PROJECT_REF ?? undefined,
    sqlPath: process.env.SQL_SCHEMA_PATH ?? path.join(BACKEND_ROOT, 'data', 'init', 'sql.txt'),
    algeriaDataPath: process.env.ALGERIA_DATA_PATH ?? path.join(BACKEND_ROOT, 'data', 'init', 'algeria.txt'),
    ...overrides,
  };
  if (!cfg.databaseUrl && !cfg.supabaseAccessToken) {
    throw new Error(
      [
        'No Supabase credentials found.',
        'Set DATABASE_URL (direct Postgres — Supabase dashboard → Project Settings → Database → Connection string)',
        'and/or SUPABASE_ACCESS_TOKEN (sbp_… personal access token) in backend/.env — see backend/.env.example.',
      ].join('\n'),
    );
  }
  return cfg;
}
