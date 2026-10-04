import { Router } from 'express';
import type { DBHelper } from '../../DB/DBHelper';
import type { DomainRepository } from '../../DB/domain';
import { ApiError, wrap } from '../middleware/errors';
import { getTripDetail, searchTrips } from '../services/tripSearch';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Public trip search + detail (published, scheduled, future trips only). */
export function tripsRoutes(db: DBHelper, repo: DomainRepository): Router {
  const router = Router();

  router.get(
    '/',
    wrap(async (req, res) => {
      const from = Number(req.query.from);
      const to = Number(req.query.to);
      if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) {
        throw new ApiError(400, 'BAD_PARAM', 'Paramètres from/to requis (ids wilaya distincts)');
      }
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      const dateFrom = typeof req.query.date_from === 'string' && dateRe.test(req.query.date_from) ? req.query.date_from : undefined;
      const dateTo = typeof req.query.date_to === 'string' && dateRe.test(req.query.date_to) ? req.query.date_to : undefined;
      if (dateFrom && dateTo && dateFrom > dateTo) {
        throw new ApiError(400, 'BAD_PARAM', 'date_from doit être antérieure ou égale à date_to');
      }
      // Task 3.1 — optional finer-grained "from-Commune/to-Commune search":
      // on top of the wilaya match every search already does, further
      // restrict to trips whose pickup/dropoff WPoint actually serves this
      // exact commune (or is unrestricted — see searchTrips()'s comment).
      const fromCommuneId = Number.isInteger(Number(req.query.from_commune_id)) && req.query.from_commune_id !== undefined ? Number(req.query.from_commune_id) : undefined;
      const toCommuneId = Number.isInteger(Number(req.query.to_commune_id)) && req.query.to_commune_id !== undefined ? Number(req.query.to_commune_id) : undefined;
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(50, Math.max(1, Number(req.query.page_size) || 10));
      const result = await searchTrips(db, { fromWilayaId: from, toWilayaId: to, fromCommuneId, toCommuneId, dateFrom, dateTo, page, pageSize });
      // Task 12.2 — every search is logged (zero-result or not) so admins can
      // see unmet demand (admin_failed_searches()), not just successful bookings.
      repo
        .logSearch({ fromWilayaId: from, toWilayaId: to, fromCommuneId, toCommuneId, dateFrom, dateTo, resultsCount: result.total })
        .catch((err) => console.error('✗ log_search failed:', err));
      res.json(result);
    }),
  );

  router.get(
    '/:id',
    wrap(async (req, res) => {
      const id = req.params.id;
      if (!UUID_RE.test(id)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
      res.json(await getTripDetail(db, id));
    }),
  );

  /**
   * Segment-specific remaining capacity (Task 2.3) — the trip detail's
   * flat `seats_available` is the whole-route bottleneck; once a customer
   * has picked a pickup/dropoff pair on the booking form, this reflects
   * the real remaining capacity for exactly that segment.
   */
  router.get(
    '/:id/availability',
    wrap(async (req, res) => {
      const id = req.params.id;
      if (!UUID_RE.test(id)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
      const fromWpointId = typeof req.query.from_wpoint_id === 'string' ? req.query.from_wpoint_id : null;
      const toWpointId = typeof req.query.to_wpoint_id === 'string' ? req.query.to_wpoint_id : null;
      if (fromWpointId && !UUID_RE.test(fromWpointId)) throw new ApiError(400, 'BAD_PARAM', 'from_wpoint_id invalide');
      if (toWpointId && !UUID_RE.test(toWpointId)) throw new ApiError(400, 'BAD_PARAM', 'to_wpoint_id invalide');
      const seatsAvailable = await repo.seatsAvailable(id, fromWpointId, toWpointId);
      res.json({ seats_available: seatsAvailable });
    }),
  );

  /**
   * Task 4.1 — the set of Communes a given stop is actually configured to
   * serve, so the booking form can offer a commune picker scoped to real
   * coverage instead of the full (potentially huge) wilaya commune list.
   * Empty array means unrestricted — every commune of that WPoint's wilaya
   * is acceptable (same convention as the admin WPoint editor).
   */
  router.get(
    '/:id/wpoints/:wpointId/communes',
    wrap(async (req, res) => {
      if (!UUID_RE.test(req.params.id)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
      if (!UUID_RE.test(req.params.wpointId)) throw new ApiError(400, 'BAD_PARAM', 'wpointId invalide');
      res.json({ commune_ids: await repo.wpointCommuneIds(req.params.wpointId) });
    }),
  );

  return router;
}
