import { Router } from 'express';
import type { DBHelper } from '../../DB/DBHelper';
import { ApiError, wrap } from '../middleware/errors';
import { getTripDetail, searchTrips } from '../services/tripSearch';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Public trip search + detail (published, scheduled, future trips only). */
export function tripsRoutes(db: DBHelper): Router {
  const router = Router();

  router.get(
    '/',
    wrap(async (req, res) => {
      const from = Number(req.query.from);
      const to = Number(req.query.to);
      if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) {
        throw new ApiError(400, 'BAD_PARAM', 'Paramètres from/to requis (ids wilaya distincts)');
      }
      const date =
        typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : undefined;
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(50, Math.max(1, Number(req.query.page_size) || 10));
      res.json(await searchTrips(db, { fromWilayaId: from, toWilayaId: to, date, page, pageSize }));
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

  return router;
}
