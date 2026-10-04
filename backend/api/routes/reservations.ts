import { Router } from 'express';
import { z } from 'zod';
import type { DBHelper } from '../../DB/DBHelper';
import type { DomainRepository, PaymentMethod } from '../../DB/domain';
import { ApiError, wrap } from '../middleware/errors';
import { GATEWAY_NAME, generateTransactionId } from '../payments/mockGateway';
import { requireAuth, requireCustomer } from '../middleware/session';
import { streamReceiptPdf } from '../services/receipt';
import { randomToken, sha256 } from '../auth/passwords';

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

const checkoutSchema = z.object({
  method: z.enum(['cib', 'edahabia', 'card', 'bank_transfer']),
  // Defaults to the full remaining balance when omitted.
  amount: z.number().positive().optional(),
});

const rateDriverSchema = z.object({
  stars: z.number().int().min(1).max(5),
  review: z.string().max(2000).nullish(),
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

  // Task 7.1 — "Reservation → Payment intent → Gateway transaction" step,
  // initiated by the customer. The actual "→ Payment confirmation" step
  // only ever happens later, asynchronously, via the webhook
  // (POST /api/payments/webhook/mock) — never from this route or anything
  // the browser does — so a client can never just claim "I paid".
  router.post(
    '/:id/checkout',
    wrap(async (req, res) => {
      const id = req.params.id;
      if (!UUID_RE.test(id)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
      const b = checkoutSchema.parse(req.body);
      const row = await db.selectOne<{ id: string; customer_id: string; status: string; total_price: string }>('reservation', {
        columns: ['id', 'customer_id', 'status', 'total_price'],
        where: { id },
      });
      if (!row) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
      if (row.customer_id !== req.user!.customer_id) {
        throw new ApiError(403, 'FORBIDDEN', 'Cette réservation ne vous appartient pas');
      }
      if (row.status === 'cancelled') {
        throw new ApiError(409, 'NOT_PAYABLE', 'Une réservation annulée ne peut pas être payée');
      }

      // Re-use an already-open checkout instead of piling up duplicate
      // pending intents if the customer clicks "payer" more than once.
      const existing = await repo.findOpenGatewayIntent(id);
      const transactionId = existing?.gateway_transaction_id ?? generateTransactionId();
      if (!existing) {
        const balanceDue = Number(row.total_price) - Number(await repo.amountPaid(id));
        const amount = b.amount ?? Math.max(balanceDue, 0);
        if (amount <= 0) throw new ApiError(409, 'ALREADY_PAID', 'Cette réservation est déjà entièrement payée');
        await repo.createGatewayPaymentIntent({
          reservationId: id,
          amount,
          method: b.method as PaymentMethod,
          gateway: GATEWAY_NAME,
          gatewayTransactionId: transactionId,
        });
      }
      res.status(201).json({ checkout_url: `/api/payments/checkout/${transactionId}`, transaction_id: transactionId });
    }),
  );

  // Task 9.3 — pay (fully or partially) straight from the customer's wallet
  // balance, no gateway round-trip. pay_reservation_with_wallet() itself
  // enforces sufficient balance and auto-confirms the reservation once
  // fully paid, exactly like a successful gateway webhook would.
  router.post(
    '/:id/pay-wallet',
    wrap(async (req, res) => {
      const id = req.params.id;
      if (!UUID_RE.test(id)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
      const b = z.object({ amount: z.number().positive().optional() }).parse(req.body ?? {});
      const row = await db.selectOne<{ id: string; customer_id: string; status: string }>('reservation', {
        columns: ['id', 'customer_id', 'status'],
        where: { id },
      });
      if (!row) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
      if (row.customer_id !== req.user!.customer_id) {
        throw new ApiError(403, 'FORBIDDEN', 'Cette réservation ne vous appartient pas');
      }
      if (row.status === 'cancelled') {
        throw new ApiError(409, 'NOT_PAYABLE', 'Une réservation annulée ne peut pas être payée');
      }
      const paymentId = await repo.payReservationWithWallet(id, b.amount ?? null);
      const balance = await repo.walletBalance(req.user!.customer_id!);
      res.status(201).json({ ok: true, payment_id: paymentId, wallet_balance: balance });
    }),
  );

  // Task 7.4 — read-only preview of the cancellation-refund percentage that
  // would currently apply, so the UI can warn the customer before they
  // confirm ("annuler maintenant ne rembourse que 50%", etc.) — uses the
  // exact same cancellation_refund_pct() function cancel_reservation() does.
  router.get(
    '/:id/cancellation-preview',
    wrap(async (req, res) => {
      const id = req.params.id;
      if (!UUID_RE.test(id)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
      const row = await db.selectOne<{ id: string; customer_id: string; trip_id: string }>('reservation', {
        columns: ['id', 'customer_id', 'trip_id'],
        where: { id },
      });
      if (!row) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
      if (row.customer_id !== req.user!.customer_id) {
        throw new ApiError(403, 'FORBIDDEN', 'Cette réservation ne vous appartient pas');
      }
      const refundPct = await repo.cancellationRefundPctPreview(row.trip_id);
      res.json({ refund_pct: refundPct });
    }),
  );

  // Task 9.5 — own receipt, generated on the fly (nothing stored on disk).
  router.get(
    '/:id/receipt.pdf',
    wrap(async (req, res) => {
      const id = req.params.id;
      if (!UUID_RE.test(id)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
      const data = await repo.getReceiptData(id);
      if (!data) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
      if (data.header.customer_id !== req.user!.customer_id) {
        throw new ApiError(403, 'FORBIDDEN', 'Cette réservation ne vous appartient pas');
      }
      streamReceiptPdf(res, data);
    }),
  );

  router.get(
    '/:id/payments',
    wrap(async (req, res) => {
      const id = req.params.id;
      if (!UUID_RE.test(id)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
      const row = await db.selectOne<{ id: string; customer_id: string }>('reservation', { columns: ['id', 'customer_id'], where: { id } });
      if (!row) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
      if (row.customer_id !== req.user!.customer_id) {
        throw new ApiError(403, 'FORBIDDEN', 'Cette réservation ne vous appartient pas');
      }
      const payments = await db.raw(
        `select v.* from v_payment v join payment p on p.id = v.id where p.reservation_id = $1 order by v.created_at desc`,
        [id],
      );
      res.json({ payments });
    }),
  );

  // Task 6.3 — customer rates the driver of a completed trip.
  router.post(
    '/:id/rate-driver',
    wrap(async (req, res) => {
      const id = req.params.id;
      if (!UUID_RE.test(id)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
      const b = rateDriverSchema.parse(req.body);
      const row = await db.selectOne<{ id: string; customer_id: string }>('reservation', { columns: ['id', 'customer_id'], where: { id } });
      if (!row) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
      if (row.customer_id !== req.user!.customer_id) {
        throw new ApiError(403, 'FORBIDDEN', 'Cette réservation ne vous appartient pas');
      }
      const ratingId = await repo.submitRating({
        reservationId: id,
        direction: 'customer_to_driver',
        stars: b.stars,
        review: b.review ?? null,
        raterCustomerId: req.user!.customer_id!,
      });
      res.status(201).json({ rating: await repo.getRating(ratingId) });
    }),
  );

  router.get(
    '/:id/rating-status',
    wrap(async (req, res) => {
      const id = req.params.id;
      if (!UUID_RE.test(id)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
      const row = await db.selectOne<{ id: string; customer_id: string }>('reservation', { columns: ['id', 'customer_id'], where: { id } });
      if (!row) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
      if (row.customer_id !== req.user!.customer_id) {
        throw new ApiError(403, 'FORBIDDEN', 'Cette réservation ne vous appartient pas');
      }
      res.json(await repo.getReservationRatingStatus(id));
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

  // ── helpers shared by the sections below ──────────────────────────────────
  async function ownReservationOrThrow(req: { params: Record<string, string>; user?: { customer_id?: string | null } }): Promise<{ id: string; customer_id: string }> {
    const id = req.params.id;
    if (!UUID_RE.test(id)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
    const row = await db.selectOne<{ id: string; customer_id: string }>('reservation', { columns: ['id', 'customer_id'], where: { id } });
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
    if (row.customer_id !== req.user!.customer_id) throw new ApiError(403, 'FORBIDDEN', 'Cette réservation ne vous appartient pas');
    return row;
  }

  // ── Task 10.6 — group bookings: named passenger list + optional fare split ─
  const passengersSchema = z.object({
    passengers: z
      .array(
        z.object({
          full_name: z.string().trim().min(1).max(200),
          phone: z.string().regex(/^\+?[0-9]{8,15}$/).nullish(),
          fare_share: z.number().min(0).nullish(),
        }),
      )
      .min(1)
      .max(30),
  });
  router.put(
    '/:id/passengers',
    wrap(async (req, res) => {
      const row = await ownReservationOrThrow(req);
      const b = passengersSchema.parse(req.body);
      await repo.setReservationPassengers(row.id, b.passengers);
      res.json({ passengers: await repo.listReservationPassengers(row.id) });
    }),
  );
  router.get(
    '/:id/passengers',
    wrap(async (req, res) => {
      const row = await ownReservationOrThrow(req);
      res.json({ passengers: await repo.listReservationPassengers(row.id) });
    }),
  );

  // ── Task 10.7 — accessibility / service requirements ───────────────────────
  const requirementsSchema = z.object({
    needs_wheelchair: z.boolean().optional(),
    has_pet: z.boolean().optional(),
    luggage_count: z.number().int().min(0).max(50).optional(),
    special_requirements: z.string().max(1000).nullish(),
  });
  router.put(
    '/:id/requirements',
    wrap(async (req, res) => {
      const row = await ownReservationOrThrow(req);
      const b = requirementsSchema.parse(req.body);
      await repo.setReservationRequirements(row.id, {
        needsWheelchair: b.needs_wheelchair,
        hasPet: b.has_pet,
        luggageCount: b.luggage_count,
        specialRequirements: b.special_requirements ?? undefined,
      });
      res.json({ ok: true });
    }),
  );

  // ── Task 11.2 — in-app messaging, scoped to this reservation ────────────────
  router.get(
    '/:id/conversation',
    wrap(async (req, res) => {
      const row = await ownReservationOrThrow(req);
      const conversationId = await repo.getOrCreateConversation(row.id);
      const messages = await repo.listMessages(conversationId);
      res.json({ conversation_id: conversationId, messages });
    }),
  );
  router.post(
    '/:id/conversation/messages',
    wrap(async (req, res) => {
      const row = await ownReservationOrThrow(req);
      const b = z.object({ body: z.string().trim().min(1).max(2000) }).parse(req.body);
      const conversationId = await repo.getOrCreateConversation(row.id);
      const id = await repo.sendMessage(conversationId, 'customer', req.user!.customer_id!, b.body);
      res.status(201).json({ id });
    }),
  );
  router.post(
    '/:id/conversation/read',
    wrap(async (req, res) => {
      const row = await ownReservationOrThrow(req);
      const conversationId = await repo.getOrCreateConversation(row.id);
      res.json({ marked: await repo.markConversationRead(conversationId, 'customer') });
    }),
  );

  // ── Task 11.3 — contact reveal (honest masked-calling scope, see sql.txt) ──
  router.post(
    '/:id/reveal-contact',
    wrap(async (req, res) => {
      const row = await ownReservationOrThrow(req);
      const phone = await repo.revealContact(row.id, 'customer', req.user!.customer_id!);
      res.json({ phone });
    }),
  );

  // ── Task 11.4 — shareable live-trip link ────────────────────────────────────
  router.post(
    '/:id/share-links',
    wrap(async (req, res) => {
      const row = await ownReservationOrThrow(req);
      const b = z.object({ ttl_hours: z.number().min(1).max(168).optional() }).parse(req.body ?? {});
      const token = randomToken();
      const id = await repo.createShareToken(row.id, sha256(token), b.ttl_hours ?? 24);
      res.status(201).json({ id, token });
    }),
  );
  router.get(
    '/:id/share-links',
    wrap(async (req, res) => {
      const row = await ownReservationOrThrow(req);
      res.json({ links: await repo.listShareTokens(row.id) });
    }),
  );
  router.post(
    '/:id/share-links/:tokenId/revoke',
    wrap(async (req, res) => {
      const row = await ownReservationOrThrow(req);
      await repo.revokeShareToken(req.params.tokenId, row.id);
      res.json({ ok: true });
    }),
  );

  return router;
}
