import { Router } from 'express';
import { z } from 'zod';
import type { DBHelper } from '../../DB/DBHelper';
import type { DomainRepository } from '../../DB/domain';
import { ApiError, wrap } from '../middleware/errors';
import { requireAuth, requireCustomer } from '../middleware/session';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const reserveSchema = z.object({
  trip_id: z.string().uuid(),
  seats: z.number().int().min(1).max(30),
  pickup_wpoint_id: z.string().uuid().nullish(),
  dropoff_wpoint_id: z.string().uuid().nullish(),
  notes: z.string().max(1000).nullish(),
  // Optional precise pin the customer dropped on the map — in addition to
  // (not instead of) the wilaya-level wpoint above, which stays the fare's
  // source of truth.
  pickup_lat: z.number().min(-90).max(90).nullish(),
  pickup_lon: z.number().min(-180).max(180).nullish(),
  dropoff_lat: z.number().min(-90).max(90).nullish(),
  dropoff_lon: z.number().min(-180).max(180).nullish(),
});

interface ReservationRow {
  id: string;
  code: string;
  status: string;
  seats: number;
  total_price: string;
  currency: string;
  pickup_wpoint_id: string | null;
  dropoff_wpoint_id: string | null;
  notes: string | null;
  created_at: string;
  trip_code: string;
  departure_at: string;
  trajectory_name: string;
  pickup_lat: string | null;
  pickup_lon: string | null;
  dropoff_lat: string | null;
  dropoff_lon: string | null;
}

function reservationSelect(db: DBHelper, whereSql: string, params: unknown[]): Promise<ReservationRow[]> {
  return db.raw<ReservationRow>(
    `select r.id, r.code, r.status, r.seats, r.total_price, r.currency,
            r.pickup_wpoint_id, r.dropoff_wpoint_id, r.notes, r.created_at,
            r.pickup_lat, r.pickup_lon, r.dropoff_lat, r.dropoff_lon,
            t.code as trip_code, t.departure_at, tj.name as trajectory_name
       from reservation r
       join trip t       on t.id = r.trip_id
       join trajectory tj on tj.id = t.trajectory_id
      where ${whereSql}
      order by r.created_at desc`,
    params,
  );
}

/** Customer area: book / list / cancel own reservations. */
export function reservationsRoutes(db: DBHelper, repo: DomainRepository): Router {
  const router = Router();
  router.use(requireAuth, requireCustomer);

  router.post(
    '/',
    wrap(async (req, res) => {
      const b = reserveSchema.parse(req.body);
      const customerId = req.user!.customer_id!;
      const reservationId = await repo.reserve({
        tripId: b.trip_id,
        customerId,
        seats: b.seats,
        pickupWpointId: b.pickup_wpoint_id ?? null,
        dropoffWpointId: b.dropoff_wpoint_id ?? null,
        notes: b.notes ?? null,
      });
      if (b.pickup_lat != null || b.pickup_lon != null || b.dropoff_lat != null || b.dropoff_lon != null) {
        await repo.setReservationGeo(reservationId, {
          pickupLat: b.pickup_lat ?? null,
          pickupLon: b.pickup_lon ?? null,
          dropoffLat: b.dropoff_lat ?? null,
          dropoffLon: b.dropoff_lon ?? null,
        });
      }
      const rows = await reservationSelect(db, 'r.id = $1', [reservationId]);
      res.status(201).json({ reservation: rows[0] });
    }),
  );

  router.get(
    '/me',
    wrap(async (req, res) => {
      res.json({ reservations: await reservationSelect(db, 'r.customer_id = $1', [req.user!.customer_id!]) });
    }),
  );

  router.post(
    '/:id/cancel',
    wrap(async (req, res) => {
      const id = req.params.id;
      if (!UUID_RE.test(id)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
      const row = await db.selectOne<{ id: string; customer_id: string; status: string }>('reservation', {
        columns: ['id', 'customer_id', 'status'],
        where: { id },
      });
      if (!row) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
      if (row.customer_id !== req.user!.customer_id) {
        throw new ApiError(403, 'FORBIDDEN', 'Cette réservation ne vous appartient pas');
      }
      await repo.cancelReservation(id);
      res.json({ ok: true });
    }),
  );

  return router;
}
