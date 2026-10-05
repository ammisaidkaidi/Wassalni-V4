/**
 * logger.ts — Task 20.2: structured logging + error tracking hook.
 *
 * Deliberately minimal (no new dependency): every call prints ONE JSON line
 * to stdout (info/warn) or stderr (error), which is exactly the shape any
 * real log pipeline (CloudWatch, Loki, Datadog agent, `docker logs | jq`,
 * …) wants to ingest — newline-delimited JSON, one record per line, no
 * multi-line stack traces breaking the parser. This replaces the ad-hoc
 * `console.log('⏱ …')` emoji-prefixed lines used elsewhere in this codebase
 * for anything that needs to be *queried* later (by request id, event type,
 * reservation id, etc.); the emoji one-liners are left alone where they're
 * just human-readable startup/ticker heartbeats, not something an operator
 * would ever search a log aggregator for.
 *
 * "Error tracking" (Task 20.2) — this project has no external APM/error
 * tracker configured (no Sentry/Datadog DSN in backend/.env), so there is
 * nothing real to wire up without inventing credentials that don't exist.
 * `reportError()` is the single integration point: today it structured-logs
 * to stderr (which is itself the tracking record — the same line a real
 * agent would otherwise forward); plugging in a real APM later is a
 * one-function change, not a refactor of every call site.
 */

type Level = 'info' | 'warn' | 'error';

export interface LogMeta {
  [key: string]: unknown;
}

function write(level: Level, event: string, meta?: LogMeta): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  });
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export const log = {
  info(event: string, meta?: LogMeta): void {
    write('info', event, meta);
  },
  warn(event: string, meta?: LogMeta): void {
    write('warn', event, meta);
  },
  error(event: string, meta?: LogMeta): void {
    write('error', event, meta);
  },
};

/**
 * Error-tracking integration point (see file header). Call this for any
 * error that should survive beyond a single request's log line — unhandled
 * 500s today; swap the body for `Sentry.captureException(err, {...})` (or
 * equivalent) the day a real DSN exists, without touching any caller.
 */
export function reportError(err: unknown, context?: LogMeta): void {
  const serialized =
    err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : { message: String(err) };
  log.error('error.unhandled', { ...context, error: serialized });
}
