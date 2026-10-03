import { Router } from 'express';
import { z } from 'zod';
import type { DBHelper } from '../../DB/DBHelper';
import type { DomainRepository } from '../../DB/domain';
import type { AuthService } from '../auth/authService';
import { ApiError, wrap } from '../middleware/errors';

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
        drivers: await db.select('driver', { columns: ['id', 'full_name', 'nin', 'phone', 'email'], orderBy: 'full_name' }),
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
        vehicles: await db.select('vehicle', { columns: ['id', 'matricule', 'seats', 'make', 'model'], orderBy: 'matricule' }),
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
      try {
        const count = await repo.setWpointCommunes(uuidParam(req.params.wpointId), commune_ids);
        res.json({ ok: true, count });
      } catch (err) {
        if (err instanceof Error && err.message.includes('wilaya de ce WPoint')) {
          throw new ApiError(400, 'BAD_COMMUNE', err.message);
        }
        throw err;
      }
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
      await repo.refundPayment(uuidParam(req.params.id), b.amount ?? null);
      res.json({ ok: true });
    }),
  );
  router.get(
    '/refunds-due',
    wrap(async (_req, res) => {
      res.json({ refunds: await repo.refundsDue() });
    }),
  );

  return router;
}
