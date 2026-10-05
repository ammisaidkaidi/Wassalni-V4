import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { log } from '../logger';

declare module 'express-serve-static-core' {
  interface Request {
    /** Task 20.2 — correlates one request across access log, error log, and the client (echoed as X-Request-Id). */
    requestId: string;
  }
}

const HEADER = 'x-request-id';

/**
 * Task 20.2 — request IDs + structured access logging.
 *
 * Reuses an inbound X-Request-Id (e.g. set by a load balancer/reverse
 * proxy) when present and looks like an id, otherwise mints one. Echoes it
 * back on the response so a client/support ticket can quote the exact
 * request, and attaches it to every structured log line this request
 * produces (including errorHandler's).
 */
export const requestContext: RequestHandler = (req, res, next) => {
  const incoming = req.header(HEADER);
  req.requestId = incoming && /^[\w-]{1,100}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    // Skip the health-check spam a load balancer/uptime monitor generates
    // every few seconds — not useful signal, just noise in the log stream.
    if (req.path === '/api/health') return;
    log.info('http.request', {
      request_id: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Math.round(durationMs * 100) / 100,
      user_id: req.user?.id ?? null,
      role: req.user?.role ?? null,
      ip: req.ip,
    });
  });

  next();
};
