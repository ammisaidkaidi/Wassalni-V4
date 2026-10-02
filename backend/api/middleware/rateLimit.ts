import type { RequestHandler } from 'express';
import { ApiError } from './errors';

/** Naive in-memory fixed-window rate limiter (per IP) — fine for a single node. */
export function rateLimit(opts: { windowMs: number; max: number; message?: string }): RequestHandler {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req, _res, next) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    }
    const h = hits.get(key);
    if (!h || h.reset < now) {
      hits.set(key, { count: 1, reset: now + opts.windowMs });
      next();
      return;
    }
    h.count += 1;
    if (h.count > opts.max) {
      next(new ApiError(429, 'RATE_LIMITED', opts.message ?? 'Trop de requêtes — patientez un instant'));
      return;
    }
    next();
  };
}
