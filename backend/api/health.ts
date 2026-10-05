/**
 * health.ts — Task 20.3: health monitoring.
 *
 * Two layers, deliberately kept apart so the public one never leaks
 * infrastructure details (Task 20.1 — no sensitive information leaked):
 *
 *  - `GET /api/health` (public, used by load balancers/uptime monitors):
 *    just {ok, db reachable, uptime}. No internal versions, no scheduler
 *    timings, no provider modes.
 *  - `GET /api/admin/health` (admin-only): full breakdown — DB latency,
 *    every background scheduler's last-run/last-success/last-error, and
 *    which payment/SMS/email/push providers are live vs. sandbox/mock —
 *    the thing an operator actually needs when deciding "is this
 *    deployment actually healthy, not just 'the process is running'".
 *
 * Scheduler health is an in-memory registry updated by server.ts's own
 * setInterval tickers (no new table — the tickers already exist from
 * Phases 7/13/16/17/18; this just observes them). A scheduler is flagged
 * `stale` when its last successful run is older than ~3x its own interval,
 * which is the cheapest reliable signal that a ticker silently died
 * (uncaught exception outside its own .catch, interval cleared, etc.).
 */
import type { DBHelper } from '../DB';

export type SchedulerName = 'payment_expiry' | 'trip_lifecycle' | 'push_dispatch' | 'sms_dispatch' | 'backup' | 'restore_drill';

interface SchedulerState {
  intervalMs: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
}

const schedulers = new Map<SchedulerName, SchedulerState>();

/** Called once per ticker at server startup so a never-yet-run scheduler still reports its expected cadence instead of looking "unknown". */
export function registerScheduler(name: SchedulerName, intervalMs: number): void {
  schedulers.set(name, { intervalMs, lastRunAt: null, lastSuccessAt: null, lastError: null });
}

/** Called by each ticker's own .then()/.catch() — never throws, never affects the ticker it's observing. */
export function recordTick(name: SchedulerName, outcome: { ok: true } | { ok: false; error: string }): void {
  const s = schedulers.get(name);
  if (!s) return;
  const now = new Date().toISOString();
  s.lastRunAt = now;
  if (outcome.ok) {
    s.lastSuccessAt = now;
    s.lastError = null;
  } else {
    s.lastError = outcome.error;
  }
}

export interface SchedulerHealth {
  name: SchedulerName;
  interval_ms: number;
  last_run_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  /** No successful run within ~3x the expected interval (or never ran at all past that grace period since boot). */
  stale: boolean;
}

function schedulerHealthSnapshot(processUptimeMs: number): SchedulerHealth[] {
  return [...schedulers.entries()].map(([name, s]) => {
    const graceMs = s.intervalMs * 3;
    const reference = s.lastSuccessAt ? new Date(s.lastSuccessAt).getTime() : null;
    const stale = reference !== null ? Date.now() - reference > graceMs : processUptimeMs > graceMs;
    return {
      name,
      interval_ms: s.intervalMs,
      last_run_at: s.lastRunAt,
      last_success_at: s.lastSuccessAt,
      last_error: s.lastError,
      stale,
    };
  });
}

/** Public health check — cheap, no secrets, safe to expose to an unauthenticated load balancer. */
export async function publicHealth(db: DBHelper): Promise<{ ok: boolean; db: boolean; uptime_s: number }> {
  let dbOk = true;
  try {
    await db.raw('select 1');
  } catch {
    dbOk = false;
  }
  return { ok: dbOk, db: dbOk, uptime_s: Math.round(process.uptime()) };
}

export interface DetailedHealth {
  ok: boolean;
  uptime_s: number;
  db: { ok: boolean; latency_ms: number | null };
  schedulers: SchedulerHealth[];
  payments: { gateway_mode: 'mock_sandbox' };
  notifications: {
    email_mode: 'smtp' | 'dev_console';
    sms_mode: 'sandbox' | string;
    push_mode: 'configured' | 'ephemeral_keys';
  };
}

/** Admin-only detailed health — the real operational picture. */
export async function detailedHealth(
  db: DBHelper,
  cfg: { otpDevMode: boolean; sms: { provider?: string }; vapidIsEphemeral: boolean },
): Promise<DetailedHealth> {
  let dbOk = true;
  let latencyMs: number | null = null;
  const startedAt = process.hrtime.bigint();
  try {
    await db.raw('select 1');
    latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  } catch {
    dbOk = false;
  }
  const scheds = schedulerHealthSnapshot(process.uptime() * 1000);
  const anyStale = scheds.some((s) => s.stale);
  return {
    ok: dbOk && !anyStale,
    uptime_s: Math.round(process.uptime()),
    db: { ok: dbOk, latency_ms: latencyMs === null ? null : Math.round(latencyMs * 100) / 100 },
    schedulers: scheds,
    // Task 7.1/7.2 explicit decision: payments run against a mock/sandbox
    // gateway, never a real one — reported plainly rather than implying a
    // live payment processor exists.
    payments: { gateway_mode: 'mock_sandbox' },
    notifications: {
      email_mode: cfg.otpDevMode ? 'dev_console' : 'smtp',
      sms_mode: cfg.sms.provider ?? 'sandbox',
      push_mode: cfg.vapidIsEphemeral ? 'ephemeral_keys' : 'configured',
    },
  };
}
