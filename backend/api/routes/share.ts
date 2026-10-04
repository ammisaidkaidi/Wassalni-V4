import { Router } from 'express';
import type { DomainRepository } from '../../DB/domain';
import { ApiError, wrap } from '../middleware/errors';
import { sha256 } from '../auth/passwords';

const TOKEN_RE = /^[0-9a-f]{16,128}$/i;

/**
 * Task 11.4 — Shareable live-trip link, public (no auth — the whole point
 * is a stranger holding the link can see it) and read-only. Deliberately
 * exposes only trip status/ETA/driver position (see get_shared_trip_info()
 * in sql.txt) — no names, phone numbers, or pricing.
 */
export function shareRoutes(repo: DomainRepository): Router {
  const router = Router();

  router.get(
    '/:token',
    wrap(async (req, res) => {
      const token = req.params.token;
      if (!TOKEN_RE.test(token)) throw new ApiError(400, 'BAD_PARAM', 'Lien invalide');
      res.json(await repo.getSharedTripInfo(sha256(token)));
    }),
  );

  return router;
}
