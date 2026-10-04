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
  // Task 4.1 — optional precise Commune within the pickup/dropoff wpoint's
  // wilaya; validated server-side (wilaya match + the stop's configured
  // coverage, if any) by set_reservation_communes().
  pickup_commune_id: z.number().int().min(1).nullish(),
  dropoff_commune_id: z.number().int().min(1).nullish(),
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
  trip_id: string;
  trip_code: string;
  trip_status: string;
  departure_at: string;
  trajectory_name: string;
  pickup_lat: string | null;
  pickup_lon: string | null;
  dropoff_lat: string | null;
  dropoff_lon: string | null;
  pickup_commune_id: number | null;
  pickup_commune_name: string | null;
  dropoff_commune_id: number | null;
  dropoff_commune_name: string | null;
  // Payment visibility (Task 1.3) — derived straight from the same
  // amount_paid() SQL function / case logic v_reservation already uses, so
  // the "paid so far" math is computed exactly once, in the database.
  amount_paid: string;
  balance_due: string;
  refunded_amount: string;
  payment_status: 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
  refund_status: 'none' | 'partial' | 'full';
}

function reservationSelect(db: DBHelper, whereSql: string, params: unknown[]): Promise<ReservationRow[]> {
  return db.raw<ReservationRow>(
    `select r.id, r.code, r.status, r.seats, r.total_price, r.currency,
            r.pickup_wpoint_id, r.dropoff_wpoint_id, r.notes, r.created_at,
            r.pickup_lat, r.pickup_lon, r.dropoff_lat, r.dropoff_lon,
            r.pickup_commune_id, cpc.nom_fr as pickup_commune_name,
            r.dropoff_commune_id, cdc.nom_fr as dropoff_commune_name,
            t.id as trip_id, t.code as trip_code, t.status as trip_status, t.departure_at, tj.name as trajectory_name,
            amount_paid(r.id) as amount_paid,
            case when r.status = 'cancelled' then 0
                 else greatest(r.total_price - amount_paid(r.id), 0) end as balance_due,
            coalesce(pstat.refunded_amount, 0) as refunded_amount,
            case
              when r.status = 'cancelled' then 'cancelled'
              when amount_paid(r.id) >= r.total_price and r.total_price > 0 then 'paid'
              when amount_paid(r.id) > 0 then 'partially_paid'
              else 'unpaid'
            end as payment_status,
            case
              when coalesce(pstat.refunded_amount, 0) = 0 then 'none'
              when coalesce(pstat.gross_paid, 0) > 0 and pstat.refunded_amount >= pstat.gross_paid then 'full'
              else 'partial'
            end as refund_status
       from reservation r
       join trip t       on t.id = r.trip_id
       join trajectory tj on tj.id = t.trajectory_id
       left join commune cpc on cpc.id = r.pickup_commune_id
       left join commune cdc on cdc.id = r.dropoff_commune_id
       left join lateral (
         select coalesce(sum(p.refunded_amount), 0) as refunded_amount,
                coalesce(sum(p.amount) filter (where p.status in ('paid', 'partially_refunded', 'refunded')), 0) as gross_paid
           from payment p
          where p.reservation_id = r.id
       ) pstat on true
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
      if (b.pickup_commune_id != null || b.dropoff_commune_id != null) {
        await repo.setReservationCommunes(reservationId, {
          pickupCommuneId: b.pickup_commune_id ?? null,
          dropoffCommuneId: b.dropoff_commune_id ?? null,
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

  router.get(
    '/:id/eta',
    wrap(async (req, res) => {
      const id = req.params.id;
      if (!UUID_RE.test(id)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
      const row = await db.selectOne<{ id: string; customer_id: string; trip_id: string; dropoff_wpoint_id: string | null }>(
        'reservation',
        { columns: ['id', 'customer_id', 'trip_id', 'dropoff_wpoint_id'], where: { id } },
      );
      if (!row) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
      if (row.customer_id !== req.user!.customer_id) {
        throw new ApiError(403, 'FORBIDDEN', 'Cette réservation ne vous appartient pas');
      }
      const result = await repo.estimateTripEtas(row.trip_id);
      // Only this reservation's own dropoff is relevant to the customer — never
      // expose the full stop list / driver position granularity to them.
      const mine = row.dropoff_wpoint_id
        ? result.stops.find((s) => s.wpoint_id === row.dropoff_wpoint_id)
        : result.stops[result.stops.length - 1];
      res.json({ position_age_seconds: result.position_age_seconds, stop: mine ?? null });
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

  /**
   * Permanently delete a cancelled/declined reservation from the customer's
   * own history. Only allowed once it's actually cancelled (never an
   * active booking), and only if it never had a payment recorded against it
   * (financial records are kept for audit — ask support otherwise).
   */
  router.delete(
    '/:id',
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
      if (row.status !== 'cancelled') {
        throw new ApiError(409, 'NOT_DELETABLE', 'Seule une réservation annulée ou refusée peut être supprimée');
      }
      const payment = await db.selectOne<{ id: string }>('payment', { columns: ['id'], where: { reservation_id: id } });
      if (payment) {
        throw new ApiError(
          409,
          'HAS_PAYMENTS',
          'Cette réservation a un historique de paiement et ne peut pas être supprimée — contactez le support',
        );
      }
      await db.raw('delete from reservation where id = $1', [id]);
      res.json({ ok: true });
    }),
  );

  return router;
}
