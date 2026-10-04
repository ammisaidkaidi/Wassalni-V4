import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import type { DBHelper } from '../../DB/DBHelper';
import type { DomainRepository } from '../../DB/domain';
import type { AuthService } from '../auth/authService';
import { ApiError, wrap } from '../middleware/errors';
import { streamReceiptPdf } from '../services/receipt';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const uuidParam = (value: string): string => {
  if (!UUID_RE.test(value)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
  return value;
};

const driverSchema = z.object({
  full_name: z.string().trim().min(2),
  nin: z.string().regex(/^\d{18}$/, 'NIN = 18 chiffres'),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/, 'téléphone invalide'),
  nif: z.string().regex(/^\d{20}$/).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});
const vehicleSchema = z.object({
  matricule: z.string().trim().min(3),
  seats: z.number().int().min(1).max(200),
  nif_owner: z.string().regex(/^\d{20}$/).optional(),
  make: z.string().optional(),
  model: z.string().optional(),
});
const vehicleInspectionSchema = z.object({
  vehicle_id: z.string().uuid(),
  inspection_date: z.string().min(1),
  expiry_date: z.string().min(1),
  maintenance_status: z.enum(['ok', 'needs_service', 'out_of_service']),
  notes: z.string().nullish(),
});
const moderateRatingSchema = z.object({
  hide: z.boolean(),
  reason: z.string().nullish(),
});
const priceSchema = z.object({
  from_wpoint_id: z.string().uuid(),
  to_wpoint_id: z.string().uuid(),
  price: z.number().nonnegative(),
  min_price: z.number().nonnegative().optional(),
  max_price: z.number().nonnegative().optional(),
});
const tripCreateSchema = z.object({
  trajectory_id: z.string().uuid(),
  departure_at: z.string().min(10),
  capacity: z.number().int().min(1).max(32767),
  seat_price: z.number().nonnegative(),
  driver_id: z.string().uuid().nullish(),
  vehicle_id: z.string().uuid().nullish(),
  arrival_eta: z.string().nullish(),
  notes: z.string().nullish(),
});
const tripUpdateSchema = z.object({
  capacity: z.number().int().min(1).max(32767).optional(),
  seat_price: z.number().nonnegative().optional(),
  driver_id: z.string().uuid().nullish(),
  vehicle_id: z.string().uuid().nullish(),
  arrival_eta: z.string().nullish(),
  notes: z.string().nullish(),
});
const customerSchema = z.object({
  full_name: z.string().trim().min(2),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/, 'téléphone invalide'),
  email: z.string().email().optional(),
});
const paymentSchema = z.object({
  reservation_id: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['cash', 'cib', 'edahabia', 'bank_transfer', 'card']),
  reference: z.string().optional(),
});
const refundSchema = z.object({ amount: z.number().positive().optional() });
const payoutBatchSchema = z.object({
  driver_id: z.string().uuid(),
  period_start: z.string().datetime({ offset: true }).or(z.string().min(8)),
  period_end: z.string().datetime({ offset: true }).or(z.string().min(8)),
});
const markPaidSchema = z.object({ reference: z.string().min(1).max(200) });
const promoCodeSchema = z.object({
  code: z.string().trim().min(3).max(40),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive(),
  min_amount: z.number().min(0).optional(),
  max_uses_total: z.number().int().positive().nullish(),
  max_uses_per_customer: z.number().int().positive().optional().default(1),
  starts_at: z.string().nullish(),
  expires_at: z.string().nullish(),
});
const locationSchema = z.object({
  gps_lat: z.number().min(-90).max(90),
  gps_lon: z.number().min(-180).max(180),
});

const driverAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, '8 caractères minimum'),
  full_name: z.string().trim().min(2).optional(),
});

/** Admin area (role = admin): fleet, trajectories, prices, trip lifecycle. */
export function adminRoutes(db: DBHelper, repo: DomainRepository, auth: AuthService): Router {
  const router = Router();

  // ── drivers ────────────────────────────────────────────────────────────────
  router.get(
    '/drivers',
    wrap(async (_req, res) => {
      res.json({
        drivers: await db.select('driver', {
          columns: ['id', 'full_name', 'nin', 'phone', 'email', 'no_show_count', 'flagged_at'],
          orderBy: 'full_name',
        }),
      });
    }),
  );
  router.post(
    '/drivers',
    wrap(async (req, res) => {
      const b = driverSchema.parse(req.body);
      res.status(201).json({ driver: await db.insert('driver', b as Record<string, unknown>) });
    }),
  );
  router.delete(
    '/drivers/:id',
    wrap(async (req, res) => {
      const rows = await db.delete('driver', { id: uuidParam(req.params.id) });
      res.json({ deleted: rows.length });
    }),
  );
  router.post(
    '/drivers/:id/location',
    wrap(async (req, res) => {
      const id = uuidParam(req.params.id);
      const b = locationSchema.parse(req.body);
      await repo.setDriverLocation(id, b.gps_lat, b.gps_lon);
      res.json({ ok: true });
    }),
  );
  router.get(
    '/drivers/:id/location',
    wrap(async (req, res) => {
      res.json({ location: await repo.getDriverLocation(uuidParam(req.params.id)) });
    }),
  );
  // ── driver login accounts (so a driver can use the driver UI) ──────────────
  router.get(
    '/drivers/:id/account',
    wrap(async (req, res) => {
      res.json({ account: await auth.getDriverAccount(uuidParam(req.params.id)) });
    }),
  );
  router.post(
    '/drivers/:id/account',
    wrap(async (req, res) => {
      const driverId = uuidParam(req.params.id);
      const b = driverAccountSchema.parse(req.body);
      const account = await auth.createDriverAccount({ driverId, email: b.email, password: b.password, full_name: b.full_name });
      res.status(201).json({ account });
    }),
  );

  // ── vehicles ───────────────────────────────────────────────────────────────
  router.get(
    '/vehicles',
    wrap(async (_req, res) => {
      res.json({
        // Task 6.2 — surfaces publish-eligibility (vehicle_is_eligible(),
        // same function sp_publish_trip itself enforces) right next to the
        // fleet list so admins see at a glance which vehicles need a fresh
        // inspection before their driver can publish a trip.
        vehicles: await db.raw(
          `select id, matricule, seats, make, model, vehicle_is_eligible(id) as is_eligible from vehicle order by matricule`,
        ),
      });
    }),
  );
  router.post(
    '/vehicles',
    wrap(async (req, res) => {
      const b = vehicleSchema.parse(req.body);
      res.status(201).json({ vehicle: await db.insert('vehicle', b as Record<string, unknown>) });
    }),
  );
  router.delete(
    '/vehicles/:id',
    wrap(async (req, res) => {
      const rows = await db.delete('vehicle', { id: uuidParam(req.params.id) });
      res.json({ deleted: rows.length });
    }),
  );
  router.post(
    '/vehicles/:id/location',
    wrap(async (req, res) => {
      const id = uuidParam(req.params.id);
      const b = locationSchema.parse(req.body);
      await repo.setVehicleLocation(id, b.gps_lat, b.gps_lon);
      res.json({ ok: true });
    }),
  );
  router.get(
    '/vehicles/:id/location',
    wrap(async (req, res) => {
      res.json({ location: await repo.getVehicleLocation(uuidParam(req.params.id)) });
    }),
  );

  // ── tracking (latest GPS fix of every driver/vehicle) ───────────────────────
  router.get(
    '/tracking',
    wrap(async (_req, res) => {
      res.json({ tracking: await repo.listTracking() });
    }),
  );

  // ── trajectories ───────────────────────────────────────────────────────────
  router.get(
    '/trajectories',
    wrap(async (_req, res) => {
      res.json({
        trajectories: await db.raw(
          `select t.id, t.name,
                  (select count(*) from wpoint w where w.trajectory_id = t.id)::int as nb_wpoints,
                  t.created_at
             from trajectory t order by t.name`,
        ),
      });
    }),
  );
  router.post(
    '/trajectories',
    wrap(async (req, res) => {
      const name = z.object({ name: z.string().trim().min(2) }).parse(req.body).name;
      res.status(201).json({ id: await repo.createTrajectory(name), name });
    }),
  );
  router.get(
    '/trajectories/:id',
    wrap(async (req, res) => {
      const record = await repo.getTrajectoryRecord(uuidParam(req.params.id));
      if (!record) throw new ApiError(404, 'NOT_FOUND', 'Trajectoire introuvable');
      res.json({ trajectory: record });
    }),
  );
  router.get(
    '/trajectories/:id/wpoints',
    wrap(async (req, res) => {
      res.json({
        wpoints: await db.raw(
          `select wp.id, wp.position, wp.wilaya_id, w.nom_fr, w.nom_ar
             from wpoint wp join wilaya w on w.id = wp.wilaya_id
            where wp.trajectory_id = $1
            order by wp.position`,
          [uuidParam(req.params.id)],
        ),
      });
    }),
  );
  router.post(
    '/trajectories/:id/wpoints',
    wrap(async (req, res) => {
      const trajectoryId = uuidParam(req.params.id);
      const { wilaya_id } = z.object({ wilaya_id: z.number().int().min(1).max(99) }).parse(req.body);
      const wilaya = await db.selectOne<{ nom_fr: string }>('wilaya', { columns: ['nom_fr'], where: { id: wilaya_id } });
      if (!wilaya) throw new ApiError(400, 'BAD_WILAYA', 'Wilaya inconnue');
      res.status(201).json({ wpoint_id: await repo.addWpoint(trajectoryId, wilaya.nom_fr) });
    }),
  );
  router.get(
    '/trajectories/:id/wpoints/:wpointId/record',
    wrap(async (req, res) => {
      uuidParam(req.params.id);
      const record = await repo.wpointToRecord(uuidParam(req.params.wpointId));
      if (!record) throw new ApiError(404, 'NOT_FOUND', 'WPoint introuvable');
      res.json({ wpoint: record });
    }),
  );
  router.post(
    '/trajectories/:id/wpoints/:wpointId/commune',
    wrap(async (req, res) => {
      uuidParam(req.params.id);
      const { commune } = z.object({ commune: z.string().trim().min(1) }).parse(req.body);
      await repo.selectCommune(uuidParam(req.params.wpointId), commune);
      res.json({ ok: true });
    }),
  );
  router.post(
    '/trajectories/:id/wpoints/:wpointId/daira',
    wrap(async (req, res) => {
      uuidParam(req.params.id);
      const { daira } = z.object({ daira: z.string().trim().min(1) }).parse(req.body);
      const added = await repo.selectDaira(uuidParam(req.params.wpointId), daira);
      res.json({ added });
    }),
  );
  router.get(
    '/trajectories/:id/wpoints/:wpointId/communes',
    wrap(async (req, res) => {
      uuidParam(req.params.id);
      res.json({ commune_ids: await repo.wpointCommuneIds(uuidParam(req.params.wpointId)) });
    }),
  );
  router.put(
    '/trajectories/:id/wpoints/:wpointId/communes',
    wrap(async (req, res) => {
      uuidParam(req.params.id);
      const { commune_ids } = z.object({ commune_ids: z.array(z.number().int().min(1)) }).parse(req.body);
      // setWpointCommunes throws a typed DomainValidationError on a
      // commune/wilaya mismatch — errorHandler maps it to a 400 directly,
      // no string-matching needed here (Task 1.5).
      const count = await repo.setWpointCommunes(uuidParam(req.params.wpointId), commune_ids);
      res.json({ ok: true, count });
    }),
  );
  router.post(
    '/trajectories/:id/wpoints/reorder',
    wrap(async (req, res) => {
      const trajectoryId = uuidParam(req.params.id);
      const { ids } = z.object({ ids: z.array(z.string().uuid()).min(1) }).parse(req.body);
      await repo.reorderWpoints(trajectoryId, ids);
      res.json({ ok: true });
    }),
  );
  router.delete(
    '/trajectories/:id/wpoints/:wpointId',
    wrap(async (req, res) => {
      const trajectoryId = uuidParam(req.params.id);
      const wpointId = uuidParam(req.params.wpointId);
      if (await repo.wpointHasTripStops(wpointId)) {
        throw new ApiError(409, 'WPOINT_IN_USE', 'Cet arrêt est utilisé par au moins un voyage existant — impossible de le supprimer');
      }
      await repo.deleteWpoint(trajectoryId, wpointId);
      res.json({ ok: true });
    }),
  );
  router.post(
    '/trajectories/:id/prices',
    wrap(async (req, res) => {
      const b = priceSchema.parse(req.body);
      await repo.setDefaultTripPrice({
        trajectoryId: uuidParam(req.params.id),
        fromWpointId: b.from_wpoint_id,
        toWpointId: b.to_wpoint_id,
        price: b.price,
        minPrice: b.min_price,
        maxPrice: b.max_price,
      });
      res.json({ ok: true });
    }),
  );

  // ── trips ──────────────────────────────────────────────────────────────────
  router.get(
    '/trips',
    wrap(async (_req, res) => {
      res.json({ trips: await db.select('v_trip', { orderBy: 'departure_at desc' }) });
    }),
  );
  router.post(
    '/trips',
    wrap(async (req, res) => {
      const b = tripCreateSchema.parse(req.body);
      const departure = new Date(b.departure_at);
      if (Number.isNaN(departure.getTime())) throw new ApiError(400, 'BAD_PARAM', 'departure_at invalide');
      const eta = b.arrival_eta ? new Date(b.arrival_eta) : null;
      const id = await repo.createTrip({
        trajectoryId: b.trajectory_id,
        departureAt: departure,
        capacity: b.capacity,
        seatPrice: b.seat_price,
        arrivalEta: eta && !Number.isNaN(eta.getTime()) ? eta : null,
        driverId: b.driver_id ?? null,
        vehicleId: b.vehicle_id ?? null,
        notes: b.notes ?? null,
      });
      res.status(201).json({ id });
    }),
  );
  router.post(
    '/trips/:id/stops',
    wrap(async (req, res) => {
      res.json({ added: await repo.populateTripStops(uuidParam(req.params.id)) });
    }),
  );
  router.post(
    '/trips/:id/publish',
    wrap(async (req, res) => {
      await repo.publishTrip(uuidParam(req.params.id));
      res.json({ ok: true });
    }),
  );
  router.post(
    '/trips/:id/prices',
    wrap(async (req, res) => {
      const b = priceSchema.parse(req.body);
      await repo.setTripPrice({
        tripId: uuidParam(req.params.id),
        fromWpointId: b.from_wpoint_id,
        toWpointId: b.to_wpoint_id,
        price: b.price,
        minPrice: b.min_price,
        maxPrice: b.max_price,
      });
      res.json({ ok: true });
    }),
  );
  router.post(
    '/trips/:id/prices/populate',
    wrap(async (req, res) => {
      const overwrite = z.object({ overwrite: z.boolean().optional() }).parse(req.body ?? {}).overwrite ?? false;
      await repo.populateTripPricesFromDefaults(uuidParam(req.params.id), overwrite);
      res.json({ ok: true });
    }),
  );
  // Task 9.1 — dynamic pricing suggestion: read-only GET, explicit admin-
  // reviewed POST to apply (reuses sp_set_trip_price(), never a separate
  // write path).
  router.get(
    '/trips/:id/suggested-price',
    wrap(async (req, res) => {
      const q = z.object({ from_wpoint_id: z.string().uuid(), to_wpoint_id: z.string().uuid() }).parse(req.query);
      const price = await repo.suggestTripPrice(uuidParam(req.params.id), q.from_wpoint_id, q.to_wpoint_id);
      res.json({ suggested_price: price });
    }),
  );
  router.post(
    '/trips/:id/apply-suggested-price',
    wrap(async (req, res) => {
      const b = z.object({ from_wpoint_id: z.string().uuid(), to_wpoint_id: z.string().uuid() }).parse(req.body);
      const tripId = uuidParam(req.params.id);
      const price = await repo.suggestTripPrice(tripId, b.from_wpoint_id, b.to_wpoint_id);
      await repo.setTripPrice({ tripId, fromWpointId: b.from_wpoint_id, toWpointId: b.to_wpoint_id, price: Number(price) });
      res.json({ ok: true, applied_price: price });
    }),
  );
  router.post(
    '/trips/:id/cancel',
    wrap(async (req, res) => {
      await repo.cancelTrip(uuidParam(req.params.id));
      res.json({ ok: true });
    }),
  );
  router.post(
    '/trips/:id/start',
    wrap(async (req, res) => {
      await repo.startTrip(uuidParam(req.params.id));
      res.json({ ok: true });
    }),
  );
  router.post(
    '/trips/:id/complete',
    wrap(async (req, res) => {
      await repo.completeTrip(uuidParam(req.params.id));
      res.json({ ok: true });
    }),
  );
  router.post(
    '/trips/:id/close',
    wrap(async (req, res) => {
      await repo.closeTrip(uuidParam(req.params.id));
      res.json({ ok: true });
    }),
  );
  router.post(
    '/trips/:id/driver-no-show',
    wrap(async (req, res) => {
      const notes = typeof req.body?.notes === 'string' ? req.body.notes : null;
      await repo.recordDriverNoShow(uuidParam(req.params.id), notes);
      res.json({ ok: true });
    }),
  );
  router.patch(
    '/trips/:id',
    wrap(async (req, res) => {
      const id = uuidParam(req.params.id);
      const b = tripUpdateSchema.parse(req.body);
      const data: Record<string, unknown> = {};
      if (b.capacity !== undefined) data.capacity = b.capacity;
      if (b.seat_price !== undefined) data.seat_price = b.seat_price;
      if (b.driver_id !== undefined) data.driver_id = b.driver_id;
      if (b.vehicle_id !== undefined) data.vehicle_id = b.vehicle_id;
      if (b.arrival_eta !== undefined) data.arrival_eta = b.arrival_eta ? new Date(b.arrival_eta).toISOString() : null;
      if (b.notes !== undefined) data.notes = b.notes;
      if (Object.keys(data).length === 0) throw new ApiError(400, 'BAD_PARAM', 'Aucun champ à modifier');
      const rows = await db.update('trip', data, { id });
      if (rows.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Voyage introuvable');
      res.json({ trip: await repo.getTrip(id) });
    }),
  );

  // ── customers ────────────────────────────────────────────────────────────────
  router.get(
    '/customers',
    wrap(async (_req, res) => {
      res.json({ customers: await repo.listCustomers() });
    }),
  );
  router.post(
    '/customers',
    wrap(async (req, res) => {
      const b = customerSchema.parse(req.body);
      const id = await repo.createCustomer(b.full_name, b.phone, b.email ?? null);
      res.status(201).json({ customer: await repo.getCustomer(id) });
    }),
  );

  // Task 9.3 — view/adjust a customer's wallet (support/goodwill credits, corrections).
  router.get(
    '/customers/:id/wallet',
    wrap(async (req, res) => {
      const id = uuidParam(req.params.id);
      const [balance, history] = await Promise.all([repo.walletBalance(id), repo.walletHistory(id)]);
      res.json({ balance, history });
    }),
  );
  router.post(
    '/customers/:id/wallet/adjust',
    wrap(async (req, res) => {
      const b = z
        .object({ amount: z.number().refine((n) => n !== 0, 'amount must be non-zero'), description: z.string().min(1).max(500) })
        .parse(req.body);
      const id = uuidParam(req.params.id);
      const entryId = await repo.adjustWallet(id, b.amount, b.description);
      res.status(201).json({ ok: true, entry_id: entryId, balance: await repo.walletBalance(id) });
    }),
  );

  // ── reservations ─────────────────────────────────────────────────────────────
  router.get(
    '/reservations',
    wrap(async (req, res) => {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      res.json({ reservations: await repo.listReservations(status ? { status } : undefined) });
    }),
  );
  router.post(
    '/reservations/:id/confirm',
    wrap(async (req, res) => {
      await repo.confirmReservation(uuidParam(req.params.id));
      res.json({ ok: true });
    }),
  );
  router.post(
    '/reservations/:id/cancel',
    wrap(async (req, res) => {
      await repo.cancelReservation(uuidParam(req.params.id));
      res.json({ ok: true });
    }),
  );

  // ── payments ───────────────────────────────────────────────────────────────
  router.get(
    '/payments',
    wrap(async (_req, res) => {
      res.json({ payments: await repo.listPayments() });
    }),
  );
  router.post(
    '/payments',
    wrap(async (req, res) => {
      const b = paymentSchema.parse(req.body);
      const id = await repo.recordPayment({
        reservationId: b.reservation_id,
        amount: b.amount,
        method: b.method,
        reference: b.reference ?? null,
      });
      res.status(201).json({ id });
    }),
  );
  router.post(
    '/payments/:id/settle',
    wrap(async (req, res) => {
      await repo.settlePayment(uuidParam(req.params.id));
      res.json({ ok: true });
    }),
  );
  router.post(
    '/payments/:id/refund',
    wrap(async (req, res) => {
      const b = refundSchema.parse(req.body ?? {});
      const refundId = await repo.refundPayment(uuidParam(req.params.id), b.amount ?? null, req.user!.id);
      res.json({ ok: true, refund_id: refundId });
    }),
  );
  // Task 9.5 — admin can pull the receipt for any payment's reservation.
  router.get(
    '/payments/:id/receipt.pdf',
    wrap(async (req, res) => {
      const paymentId = uuidParam(req.params.id);
      const payment = await db.selectOne<{ reservation_id: string }>('payment', { columns: ['reservation_id'], where: { id: paymentId } });
      if (!payment) throw new ApiError(404, 'NOT_FOUND', 'Paiement introuvable');
      const data = await repo.getReceiptData(payment.reservation_id);
      if (!data) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
      streamReceiptPdf(res, data);
    }),
  );
  router.get(
    '/refunds-due',
    wrap(async (_req, res) => {
      res.json({ refunds: await repo.refundsDue() });
    }),
  );
  router.get(
    '/refunds-worklist',
    wrap(async (req, res) => {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      res.json({ worklist: await repo.refundWorklist(status) });
    }),
  );
  // Alias matching the Task 7.4 naming convention used elsewhere ("/refunds*").
  router.get(
    '/refunds',
    wrap(async (req, res) => {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      res.json({ refunds: await repo.refundWorklist(status) });
    }),
  );
  router.post(
    '/refunds/:id/fail',
    wrap(async (req, res) => {
      const reason = typeof req.body?.reason === 'string' && req.body.reason.trim() ? req.body.reason.trim() : 'Échec manuel (admin)';
      await repo.failRefund(uuidParam(req.params.id), req.user!.id, reason);
      res.json({ ok: true });
    }),
  );
  router.post(
    '/refunds/:id/retry',
    wrap(async (req, res) => {
      const newId = await repo.retryRefund(uuidParam(req.params.id), req.user!.id);
      res.json({ ok: true, refund_id: newId });
    }),
  );

  // ── Promo codes (Task 9.2) ───────────────────────────────────────────────────

  router.get(
    '/promo-codes',
    wrap(async (_req, res) => {
      res.json({ promo_codes: await repo.listPromoCodes() });
    }),
  );
  router.post(
    '/promo-codes',
    wrap(async (req, res) => {
      const b = promoCodeSchema.parse(req.body);
      const id = await repo.createPromoCode({
        code: b.code,
        discountType: b.discount_type,
        discountValue: b.discount_value,
        minAmount: b.min_amount,
        maxUsesTotal: b.max_uses_total ?? null,
        maxUsesPerCustomer: b.max_uses_per_customer,
        startsAt: b.starts_at ?? null,
        expiresAt: b.expires_at ?? null,
        createdBy: req.user!.id,
      });
      res.status(201).json({ id });
    }),
  );
  router.post(
    '/promo-codes/:id/activate',
    wrap(async (req, res) => {
      await repo.setPromoCodeActive(uuidParam(req.params.id), true);
      res.json({ ok: true });
    }),
  );
  router.post(
    '/promo-codes/:id/deactivate',
    wrap(async (req, res) => {
      await repo.setPromoCodeActive(uuidParam(req.params.id), false);
      res.json({ ok: true });
    }),
  );

  // ── Driver payouts (Task 8.1 / 8.2 / 8.3) ────────────────────────────────────

  router.get(
    '/drivers/:id/earnings',
    wrap(async (req, res) => {
      res.json({ summary: await repo.driverEarningsSummary(uuidParam(req.params.id)) });
    }),
  );
  router.get(
    '/drivers/:id/earnings/ledger',
    wrap(async (req, res) => {
      res.json({ ledger: await repo.listPayoutLedger(uuidParam(req.params.id)) });
    }),
  );
  router.get(
    '/payout-batches',
    wrap(async (req, res) => {
      const driverId = typeof req.query.driver_id === 'string' ? uuidParam(req.query.driver_id) : undefined;
      res.json({ batches: await repo.listPayoutBatches(driverId) });
    }),
  );
  router.post(
    '/payout-batches',
    wrap(async (req, res) => {
      const b = payoutBatchSchema.parse(req.body ?? {});
      const id = await repo.createPayoutBatch(b.driver_id, b.period_start, b.period_end);
      res.status(201).json({ batches: await repo.listPayoutBatches(b.driver_id), batch_id: id });
    }),
  );
  router.post(
    '/payout-batches/:id/mark-paid',
    wrap(async (req, res) => {
      const b = markPaidSchema.parse(req.body ?? {});
      await repo.markPayoutBatchPaid(uuidParam(req.params.id), b.reference);
      res.json({ ok: true });
    }),
  );

  // ── Task 5.3: no-show strikes ──────────────────────────────────────────────

  router.get(
    '/no-show-events',
    wrap(async (req, res) => {
      const kind = req.query.kind === 'customer' || req.query.kind === 'driver' ? req.query.kind : undefined;
      const customerId = typeof req.query.customer_id === 'string' ? uuidParam(req.query.customer_id) : undefined;
      const driverId = typeof req.query.driver_id === 'string' ? uuidParam(req.query.driver_id) : undefined;
      res.json({ events: await repo.listNoShowEvents({ kind, customerId, driverId }) });
    }),
  );

  router.get(
    '/settings/no-show-threshold',
    wrap(async (_req, res) => {
      res.json({ value: await repo.getNoShowThreshold() });
    }),
  );

  router.put(
    '/settings/no-show-threshold',
    wrap(async (req, res) => {
      const value = Number(req.body?.value);
      await repo.setNoShowThreshold(value);
      res.json({ value: await repo.getNoShowThreshold() });
    }),
  );

  // ── Task 6.1: driver KYC review queue ──────────────────────────────────────

  router.get(
    '/kyc',
    wrap(async (req, res) => {
      const status = typeof req.query.status === 'string' ? (req.query.status as 'pending' | 'approved' | 'rejected') : undefined;
      res.json({ documents: await repo.listKycDocumentsAdmin(status) });
    }),
  );

  router.get(
    '/kyc/:id/file',
    wrap(async (req, res) => {
      const doc = await repo.getKycDocument(uuidParam(req.params.id));
      if (!doc) throw new ApiError(404, 'NOT_FOUND', 'Document introuvable');
      res.setHeader('Content-Type', doc.mime_type);
      res.sendFile(path.resolve(doc.file_path));
    }),
  );

  router.post(
    '/kyc/:id/approve',
    wrap(async (req, res) => {
      await repo.approveKycDocument(uuidParam(req.params.id), req.user!.id);
      res.json({ document: await repo.getKycDocument(req.params.id) });
    }),
  );

  router.post(
    '/kyc/:id/reject',
    wrap(async (req, res) => {
      const reason = typeof req.body?.reason === 'string' ? req.body.reason : '';
      await repo.rejectKycDocument(uuidParam(req.params.id), req.user!.id, reason);
      res.json({ document: await repo.getKycDocument(req.params.id) });
    }),
  );

  // ── Task 6.2: vehicle inspection review queue ────────────────────────────────

  router.get(
    '/vehicle-inspections',
    wrap(async (req, res) => {
      const status = typeof req.query.status === 'string' ? (req.query.status as 'pending' | 'approved' | 'rejected') : undefined;
      res.json({ inspections: await repo.listVehicleInspectionsAdmin(status) });
    }),
  );

  // Admin can also directly log an inspection result for any vehicle (fleet
  // vehicles without a driver-submitted flow) — it still starts 'pending'
  // and goes through the same approve/reject actions below, no special-casing.
  router.post(
    '/vehicle-inspections',
    wrap(async (req, res) => {
      const b = vehicleInspectionSchema.parse(req.body);
      const id = await repo.submitVehicleInspection(b.vehicle_id, null, {
        inspectionDate: b.inspection_date,
        expiryDate: b.expiry_date,
        maintenanceStatus: b.maintenance_status,
        notes: b.notes ?? null,
      });
      res.status(201).json({ inspection: await repo.getVehicleInspection(id) });
    }),
  );

  router.get(
    '/vehicle-inspections/:id/file',
    wrap(async (req, res) => {
      const inspection = await repo.getVehicleInspection(uuidParam(req.params.id));
      if (!inspection || !inspection.file_path) throw new ApiError(404, 'NOT_FOUND', 'Document introuvable');
      res.setHeader('Content-Type', inspection.mime_type ?? 'application/octet-stream');
      res.sendFile(path.resolve(inspection.file_path));
    }),
  );

  router.post(
    '/vehicle-inspections/:id/approve',
    wrap(async (req, res) => {
      await repo.approveVehicleInspection(uuidParam(req.params.id), req.user!.id);
      res.json({ inspection: await repo.getVehicleInspection(req.params.id) });
    }),
  );

  router.post(
    '/vehicle-inspections/:id/reject',
    wrap(async (req, res) => {
      const reason = typeof req.body?.reason === 'string' ? req.body.reason : '';
      await repo.rejectVehicleInspection(uuidParam(req.params.id), req.user!.id, reason);
      res.json({ inspection: await repo.getVehicleInspection(req.params.id) });
    }),
  );

  // ── Task 6.3: ratings moderation ──────────────────────────────────────────────

  router.get(
    '/ratings',
    wrap(async (_req, res) => {
      res.json({ ratings: await repo.listRatingsAdmin() });
    }),
  );

  router.post(
    '/ratings/:id/moderate',
    wrap(async (req, res) => {
      const b = moderateRatingSchema.parse(req.body);
      await repo.moderateRating(uuidParam(req.params.id), req.user!.id, b.hide, b.reason ?? null);
      res.json({ rating: await repo.getRating(req.params.id) });
    }),
  );

  // ── Task 6.4: deterministic fraud / anomaly signals ───────────────────────────

  router.get(
    '/fraud-signals',
    wrap(async (_req, res) => {
      res.json({ signals: await repo.listFraudSignals() });
    }),
  );

  // ── Task 7.1/7.2: payment gateway webhook audit ledger ────────────────────────

  router.get(
    '/payment-gateway-events',
    wrap(async (req, res) => {
      const paymentId = typeof req.query.payment_id === 'string' ? req.query.payment_id : undefined;
      res.json({ events: await repo.listPaymentGatewayEvents(paymentId) });
    }),
  );

  return router;
}
