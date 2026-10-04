import type { SupabaseConnection } from '../DB/connection';

/**
 * Small, idempotent schema patches applied to the core domain tables (the
 * ones owned by data/init/sql.txt) that were introduced by the API after the
 * original install. sql.txt itself only runs on `npm run db:init`, so any
 * delta needed by already-initialised databases is applied here at every
 * server boot — mirrors authSchema.ts's approach for the app_user tables.
 */
export const DOMAIN_SCHEMA_STATEMENTS: string[] = [
  `alter table driver add column if not exists vehicle_id uuid references vehicle(id) on delete set null`,
  `alter table reservation add column if not exists pickup_lat  numeric(9,6) check (pickup_lat  is null or pickup_lat  between -90 and 90)`,
  `alter table reservation add column if not exists pickup_lon  numeric(9,6) check (pickup_lon  is null or pickup_lon  between -180 and 180)`,
  `alter table reservation add column if not exists dropoff_lat numeric(9,6) check (dropoff_lat is null or dropoff_lat between -90 and 90)`,
  `alter table reservation add column if not exists dropoff_lon numeric(9,6) check (dropoff_lon is null or dropoff_lon between -180 and 180)`,
  // Task 16.2 — Web Push: identical to the `push_subscription` table and
  // `notification.pushed_at` column defined in data/init/sql.txt, applied
  // here too so an already-initialised database picks them up without a
  // full `npm run db:init`.
  `create table if not exists push_subscription (
     id           uuid primary key default gen_random_uuid(),
     user_id      uuid not null,
     endpoint     text not null,
     p256dh       text not null,
     auth         text not null,
     user_agent   text,
     created_at   timestamptz not null default now(),
     last_seen_at timestamptz not null default now(),
     unique (user_id, endpoint)
   )`,
  `create index if not exists idx_push_subscription_user on push_subscription (user_id)`,
  `alter table notification add column if not exists pushed_at timestamptz`,
  `create index if not exists idx_notification_unpushed on notification (created_at) where pushed_at is null`,
];

export async function ensureDomainSchema(conn: SupabaseConnection): Promise<void> {
  await conn.executeScript(DOMAIN_SCHEMA_STATEMENTS);
}
