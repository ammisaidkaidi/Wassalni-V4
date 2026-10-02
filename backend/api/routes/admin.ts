import { Router } from 'express';
import { z } from 'zod';
import type { DBHelper } from '../../DB/DBHelper';
import type { DomainRepository } from '../../DB/domain';
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

/** Admin area (role = admin): fleet, trajectories, prices, trip lifecycle. */
export function adminRoutes(db: DBHelper, repo: DomainRepository): Router {
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
          `select wp.id, wp.position, w.nom_fr, w.nom_ar
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

  return router;
}
