import { Router } from 'express';
import { z } from 'zod';
import type { DBHelper } from '../../DB/DBHelper';
import type { DomainRepository } from '../../DB/domain';
import { ApiError, wrap } from '../middleware/errors';
import { requireAuth, requireDriver } from '../middleware/session';
import { getTripDetailForDriver } from '../services/tripSearch';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const uuidParam = (value: string): string => {
  if (!UUID_RE.test(value)) throw new ApiError(400, 'BAD_PARAM', 'id invalide');
  return value;
};

const locationSchema = z.object({
  gps_lat: z.number().min(-90).max(90),
  gps_lon: z.number().min(-180).max(180),
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2).optional(),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/, 'téléphone invalide').optional(),
  email: z.string().email().nullish(),
  address: z.string().nullish(),
});

const vehicleCreateSchema = z.object({
  matricule: z.string().trim().min(3),
  seats: z.number().int().min(1).max(200),
  make: z.string().nullish(),
  model: z.string().nullish(),
});
const vehicleUpdateSchema = z.object({
  matricule: z.string().trim().min(3).optional(),
  seats: z.number().int().min(1).max(200).optional(),
  make: z.string().nullish(),
  model: z.string().nullish(),
});

const trajectoryCreateSchema = z.object({ name: z.string().trim().min(2) });
const wpointAddSchema = z.object({ wilaya_id: z.number().int().min(1).max(99) });
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
  arrival_eta: z.string().nullish(),
  notes: z.string().nullish(),
});

/**
 * Driver self-service area (role = driver):
 *  - own profile + own vehicle (settings)
 *  - create trajectories/trips (always assigned to themselves) + publish them
 *  - manage own assigned trips: passenger manifest, approve/decline
 *    reservations, start/complete, live GPS position
 * Every trip/reservation-scoped action verifies it actually belongs to this
 * driver — a driver can never see/act on another driver's trip or booking.
 */
export function driverRoutes(db: DBHelper, repo: DomainRepository): Router {
  const router = Router();
  router.use(requireAuth, requireDriver);

  /** Loads the trip + enforces it belongs to the logged-in driver. */
  async function ownTripOrThrow(req: { user?: { driver_id: string | null } }, tripId: string) {
    const trip = await repo.getTrip(tripId);
    if (!trip) throw new ApiError(404, 'NOT_FOUND', 'Voyage introuvable');
    if (trip.driver_id !== req.user!.driver_id) {
      throw new ApiError(403, 'FORBIDDEN', "Ce voyage ne vous est pas assigné");
    }
    return trip;
  }

  // ── profile / vehicle (settings) ──────────────────────────────────────────

  router.get(
    '/me',
    wrap(async (req, res) => {
      const profile = await repo.getDriverProfile(req.user!.driver_id!);
      if (!profile) throw new ApiError(404, 'NOT_FOUND', 'Profil chauffeur introuvable');
      const vehicle = profile.vehicle_id ? await repo.getVehicle(profile.vehicle_id) : null;
      res.json({ user: req.user, driver: profile, vehicle });
    }),
  );

  router.patch(
    '/me',
    wrap(async (req, res) => {
      const b = profileSchema.parse(req.body);
      const profile = await repo.updateDriverProfile(req.user!.driver_id!, {
        full_name: b.full_name,
        phone: b.phone,
        email: b.email === null ? null : b.email,
        address: b.address === null ? null : b.address,
      });
      res.json({ driver: profile });
    }),
  );

  router.post(
    '/vehicle',
    wrap(async (req, res) => {
      const existing = await repo.getDriverProfile(req.user!.driver_id!);
      if (existing?.vehicle_id) {
        throw new ApiError(409, 'CONFLICT', "Vous avez déjà un véhicule — modifiez-le au lieu d'en créer un nouveau");
      }
      const b = vehicleCreateSchema.parse(req.body);
      const vehicle = await repo.createDriverVehicle(req.user!.driver_id!, {
        matricule: b.matricule,
        seats: b.seats,
        make: b.make ?? null,
        model: b.model ?? null,
      });
      res.status(201).json({ vehicle });
    }),
  );

  router.patch(
    '/vehicle',
    wrap(async (req, res) => {
      const profile = await repo.getDriverProfile(req.user!.driver_id!);
      if (!profile?.vehicle_id) throw new ApiError(404, 'NOT_FOUND', "Vous n'avez pas encore de véhicule enregistré");
      const b = vehicleUpdateSchema.parse(req.body);
      const vehicle = await repo.updateVehicle(profile.vehicle_id, {
        matricule: b.matricule,
        seats: b.seats,
        make: b.make === null ? null : b.make,
        model: b.model === null ? null : b.model,
      });
      res.json({ vehicle });
    }),
  );

  // ── trajectories (shared infrastructure — any driver may add routes) ──────

  router.get(
    '/trajectories',
    wrap(async (_req, res) => {
      res.json({ trajectories: await repo.listTrajectories() });
    }),
  );

  router.post(
    '/trajectories',
    wrap(async (req, res) => {
      const { name } = trajectoryCreateSchema.parse(req.body);
      res.status(201).json({ id: await repo.createTrajectory(name), name });
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
      const { wilaya_id } = wpointAddSchema.parse(req.body);
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

  // ── own trips: create / publish / lifecycle / manifest / GPS ─────────────

  router.get(
    '/trips',
    wrap(async (req, res) => {
      res.json({ trips: await repo.listTrips({ driver_id: req.user!.driver_id! }) });
    }),
  );

  router.post(
    '/trips',
    wrap(async (req, res) => {
      const b = tripCreateSchema.parse(req.body);
      const departure = new Date(b.departure_at);
      if (Number.isNaN(departure.getTime())) throw new ApiError(400, 'BAD_PARAM', 'departure_at invalide');
      const eta = b.arrival_eta ? new Date(b.arrival_eta) : null;
      const profile = await repo.getDriverProfile(req.user!.driver_id!);
      const id = await repo.createTrip({
        trajectoryId: b.trajectory_id,
        departureAt: departure,
        capacity: b.capacity,
        seatPrice: b.seat_price,
        arrivalEta: eta && !Number.isNaN(eta.getTime()) ? eta : null,
        // A trip created from the driver UI is always assigned to that driver
        // and, if they've registered one, their own vehicle.
        driverId: req.user!.driver_id!,
        vehicleId: profile?.vehicle_id ?? null,
        notes: b.notes ?? null,
      });
      res.status(201).json({ id });
    }),
  );

  router.post(
    '/trips/:id/stops',
    wrap(async (req, res) => {
      const tripId = uuidParam(req.params.id);
      await ownTripOrThrow(req, tripId);
      res.json({ added: await repo.populateTripStops(tripId) });
    }),
  );

  router.post(
    '/trips/:id/prices/populate',
    wrap(async (req, res) => {
      const tripId = uuidParam(req.params.id);
      await ownTripOrThrow(req, tripId);
      const overwrite = z.object({ overwrite: z.boolean().optional() }).parse(req.body ?? {}).overwrite ?? false;
      await repo.populateTripPricesFromDefaults(tripId, overwrite);
      res.json({ ok: true });
    }),
  );

  router.post(
    '/trips/:id/prices',
    wrap(async (req, res) => {
      const tripId = uuidParam(req.params.id);
      await ownTripOrThrow(req, tripId);
      const b = priceSchema.parse(req.body);
      await repo.setTripPrice({
        tripId,
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
    '/trips/:id/publish',
    wrap(async (req, res) => {
      const tripId = uuidParam(req.params.id);
      await ownTripOrThrow(req, tripId);
      await repo.publishTrip(tripId);
      res.json({ ok: true });
    }),
  );

  router.post(
    '/trips/:id/cancel',
    wrap(async (req, res) => {
      const tripId = uuidParam(req.params.id);
      await ownTripOrThrow(req, tripId);
      await repo.cancelTrip(tripId);
      res.json({ ok: true });
    }),
  );

  router.get(
    '/trips/:id',
    wrap(async (req, res) => {
      const tripId = uuidParam(req.params.id);
      await ownTripOrThrow(req, tripId);
      const detail = await getTripDetailForDriver(db, tripId);
      const manifest = await repo.getTripManifest(tripId);
      res.json({ ...detail, manifest });
    }),
  );

  router.post(
    '/trips/:id/start',
    wrap(async (req, res) => {
      const tripId = uuidParam(req.params.id);
      await ownTripOrThrow(req, tripId);
      await repo.startTrip(tripId);
      res.json({ ok: true });
    }),
  );

  router.post(
    '/trips/:id/complete',
    wrap(async (req, res) => {
      const tripId = uuidParam(req.params.id);
      await ownTripOrThrow(req, tripId);
      // closeTrip (sp_close_trip) is a strict superset of the bare complete_trip()
      // transition: it also resolves every still-confirmed reservation to
      // completed/no_show (by amount_paid) and cancels stragglers — the same
      // semantics admin's "finish trip" already uses. Using the bare transition
      // here left reservations permanently stuck at 'confirmed' when a driver
      // (rather than an admin) closed out their own trip.
      await repo.closeTrip(tripId);
      res.json({ ok: true });
    }),
  );

  router.post(
    '/trips/:id/location',
    wrap(async (req, res) => {
      const tripId = uuidParam(req.params.id);
      const trip = await ownTripOrThrow(req, tripId);
      const b = locationSchema.parse(req.body);
      await repo.setDriverLocation(req.user!.driver_id!, b.gps_lat, b.gps_lon);
      if (trip.vehicle_id) await repo.setVehicleLocation(trip.vehicle_id, b.gps_lat, b.gps_lon);
      res.json({ ok: true });
    }),
  );

  router.get(
    '/location',
    wrap(async (req, res) => {
      res.json({ location: await repo.getDriverLocation(req.user!.driver_id!) });
    }),
  );

  // ── reservations: approve / decline bookings on own trips ────────────────

  router.get(
    '/reservations',
    wrap(async (req, res) => {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      res.json({ reservations: await repo.listReservationsForDriver(req.user!.driver_id!, status) });
    }),
  );

  router.post(
    '/reservations/:id/confirm',
    wrap(async (req, res) => {
      const id = uuidParam(req.params.id);
      const ownerDriverId = await repo.getReservationTripDriver(id);
      if (!ownerDriverId) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
      if (ownerDriverId !== req.user!.driver_id) throw new ApiError(403, 'FORBIDDEN', "Cette réservation ne concerne pas vos voyages");
      await repo.confirmReservation(id);
      res.json({ ok: true });
    }),
  );

  router.post(
    '/reservations/:id/decline',
    wrap(async (req, res) => {
      const id = uuidParam(req.params.id);
      const ownerDriverId = await repo.getReservationTripDriver(id);
      if (!ownerDriverId) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
      if (ownerDriverId !== req.user!.driver_id) throw new ApiError(403, 'FORBIDDEN', "Cette réservation ne concerne pas vos voyages");
      await repo.cancelReservation(id);
      res.json({ ok: true });
    }),
  );

  return router;
}
