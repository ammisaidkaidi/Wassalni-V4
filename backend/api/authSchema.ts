import type { SupabaseConnection } from '../DB/connection';

/**
 * Auth tables for the API (installed idempotently at server boot).
 *  - app_user      : accounts (email + scrypt password hash, role, link to customer)
 *  - app_user_otp  : 6-digit 2FA codes (salted SHA-256, expiring, attempt-limited)
 *  - app_session   : server-side sessions (opaque token, only its SHA-256 is stored)
 */
export const AUTH_SCHEMA_STATEMENTS: string[] = [
  `create table if not exists app_user (
     id             uuid primary key default gen_random_uuid(),
     email          text not null unique check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'),
     password_hash  text not null,
     full_name      text not null check (btrim(full_name) <> ''),
     phone          text,
     role           text not null default 'customer' check (role in ('customer','admin','driver')),
     customer_id    uuid references customer(id) on delete set null,
     driver_id      uuid references driver(id) on delete set null,
     email_verified boolean not null default false,
     failed_attempts int not null default 0,
     locked_until   timestamptz,
     created_at     timestamptz not null default now(),
     updated_at     timestamptz not null default now()
   )`,
  // Upgrade-safe for installs created before the 'driver' role existed.
  `alter table app_user add column if not exists driver_id uuid references driver(id) on delete set null`,
  `alter table app_user drop constraint if exists app_user_role_check`,
  `alter table app_user add constraint app_user_role_check check (role in ('customer','admin','driver'))`,
  // Task 12.6 — granular admin roles. Only meaningful when role='admin';
  // every pre-existing admin account is grandfathered in as 'super_admin'
  // (the most-privileged role) so nobody already set up as an admin is
  // silently locked out of anything after this upgrade.
  `alter table app_user add column if not exists admin_role text`,
  `alter table app_user drop constraint if exists app_user_admin_role_check`,
  `alter table app_user add constraint app_user_admin_role_check
     check (admin_role is null or admin_role in ('super_admin','admin','support','finance','operations'))`,
  `update app_user set admin_role = 'super_admin' where role = 'admin' and admin_role is null`,
  `create table if not exists app_user_otp (
     id          uuid primary key default gen_random_uuid(),
     user_id     uuid not null references app_user(id) on delete cascade,
     purpose     text not null check (purpose in ('login_2fa')),
     salt        text not null,
     code_hash   text not null,
     expires_at  timestamptz not null,
     consumed_at timestamptz,
     attempts    int not null default 0,
     created_at  timestamptz not null default now()
   )`,
  `create table if not exists app_session (
     token_hash   text primary key,
     user_id      uuid not null references app_user(id) on delete cascade,
     created_at   timestamptz not null default now(),
     expires_at   timestamptz not null,
     last_seen_at timestamptz not null default now(),
     user_agent   text,
     ip           text
   )`,
  `create index if not exists idx_app_user_otp_user on app_user_otp (user_id)`,
  `create index if not exists idx_app_session_user on app_session (user_id)`,
  `alter table app_user enable row level security`,
  `alter table app_user_otp enable row level security`,
  `alter table app_session enable row level security`,
];

export async function ensureAuthSchema(conn: SupabaseConnection): Promise<void> {
  await conn.executeScript(AUTH_SCHEMA_STATEMENTS);
  // housekeeping
  await conn.execute('delete from app_session where expires_at < now()');
  await conn.execute(`delete from app_user_otp where expires_at < now() - interval '1 day'`);
}
