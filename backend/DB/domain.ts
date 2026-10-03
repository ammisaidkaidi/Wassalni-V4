import type { QueryRow, SupabaseConnection } from './connection';
import { DBHelper, type Where } from './DBHelper';

// ── domain types ──────────────────────────────────────────────────────────────

export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type PaymentMethod = 'cash' | 'cib' | 'edahabia' | 'bank_transfer' | 'card';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface CreateTripParams {
  trajectoryId: string;
  departureAt: string | Date;
  capacity: number;
  seatPrice: number | string;
  arrivalEta?: string | Date | null;
  driverId?: string | null;
  vehicleId?: string | null;
  notes?: string | null;
}

export interface ReserveParams {
  tripId: string;
  customerId: string;
  seats: number;
  pickupWpointId?: string | null;
  dropoffWpointId?: string | null;
  notes?: string | null;
}

export interface PriceParams {
  fromWpointId: string;
  toWpointId: string;
  price: number | string;
  minPrice?: number | string | null;
  maxPrice?: number | string | null;
  currency?: string | null;
  notes?: string | null;
}
export interface SetDefaultTripPriceParams extends PriceParams {
  trajectoryId: string;
}
export interface SetTripPriceParams extends PriceParams {
  tripId: string;
}

export interface RecordPaymentParams {
  reservationId: string;
  amount: number | string;
  method: PaymentMethod;
  reference?: string | null;
}

export interface TripViewRow {
  id: string;
  code: string;
  status: TripStatus;
  published_at: string | null;
  departure_at: string;
  arrival_eta: string | null;
  capacity: number;
  seat_price: string;
  currency: string;
  driver_id: string | null;
  driver_name: string | null;
  vehicle_id: string | null;
  vehicle_matricule: string | null;
  trajectory_id: string;
  trajectory_name: string;
  seats_available: number | null;
  nb_active_reservations: number | string;
}

export interface ReservationViewRow {
  id: string;
  code: string;
  status: ReservationStatus;
  seats: number;
  total_price: string;
  currency: string;
  notes: string | null;
  created_at: string;
  trip_code: string;
  departure_at: string;
  trajectory_name: string;
  customer_name: string;
  customer_phone: string;
  amount_paid: string;
  balance_due: string;
}

export interface PaymentViewRow {
  id: string;
  code: string;
  amount: string;
  refunded_amount: string;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
  reservation_code: string;
  reservation_status: ReservationStatus;
  customer_name: string;
  trip_code: string;
}

export interface RefundDueRow {
  reservation_id: string;
  reservation_code: string;
  customer_name: string;
  customer_phone: string;
  refund_due: string;
}

export interface CustomerRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  nin: string | null;
  home_wilaya_id: number | null;
  home_commune_id: number | null;
  created_at: string;
}

export interface WilayaOverviewRow {
  id: number;
  code: string;
  nom_fr: string;
  nom_ar: string;
  nom_en: string;
  nb_dairas: number;
  nb_communes: number;
  nb_codes_postaux: number;
}

export interface TripManifestRow {
  id: string;
  code: string;
  status: ReservationStatus;
  seats: number;
  total_price: string;
  currency: string;
  notes: string | null;
  customer_name: string;
  customer_phone: string;
  pickup: string | null;
  dropoff: string | null;
  pickup_wilaya_id: number | null;
  dropoff_wilaya_id: number | null;
  pickup_lat: string | null;
  pickup_lon: string | null;
  dropoff_lat: string | null;
  dropoff_lon: string | null;
}

export interface DriverProfileRow {
  id: string;
  full_name: string;
  nin: string;
  phone: string;
  email: string | null;
  address: string | null;
  vehicle_id: string | null;
}

export interface DriverReservationRow {
  id: string;
  code: string;
  status: ReservationStatus;
  seats: number;
  total_price: string;
  currency: string;
  notes: string | null;
  created_at: string;
  trip_id: string;
  trip_code: string;
  departure_at: string;
  trajectory_name: string;
  customer_name: string;
  customer_phone: string;
  pickup: string | null;
  dropoff: string | null;
  pickup_wilaya_id: number | null;
  dropoff_wilaya_id: number | null;
  pickup_lat: string | null;
  pickup_lon: string | null;
  dropoff_lat: string | null;
  dropoff_lon: string | null;
}

export interface LastLocationRow {
  gps_lat: string;
  gps_lon: string;
  recorded_at: string;
}

export interface DairaRow {
  daira_id: number;
  nom_fr: string;
  nom_ar: string;
  nom_en: string;
}

export interface CommuneRow {
  commune_id: number;
  nom_fr: string;
  nom_ar: string;
  code_postal: string | null;
}

// ── DZxxx error catalogue (mirrors the v_domain_errors view in the database) ──

export const DOMAIN_ERRORS: Readonly<Record<string, string>> = {
  DZ001: 'Generic domain rule violation',
  DZ101: 'Trajectory name is empty/blank',
  DZ102: 'Unknown trajectory id',
  DZ103: 'Trajectory identity (name) cannot change',
  DZ201: 'Unknown wilaya name/code',
  DZ202: 'Daira does not belong to the wilaya',
  DZ203: 'Commune does not belong to the wilaya',
  DZ204: 'Cannot merge WPoints of different wilayas',
  DZ205: 'Unknown WPoint id',
  DZ206: 'WPoint wilaya/trajectory cannot change',
  DZ301: 'Unknown trip id',
  DZ302: 'Trip is not scheduled / not published / already departed',
  DZ303: 'Not enough free seats on the trip',
  DZ304: 'Illegal trip status transition',
  DZ305: 'New capacity below already-held seats',
  DZ306: 'Trip is published and has active reservations; core fields locked',
  DZ307: 'Trip stops/prices locked because reservations exist',
  DZ308: 'No price defined for the selected FROM/TO stops',
  DZ401: 'Unknown reservation id',
  DZ402: 'Illegal reservation status transition / immutable field',
  DZ403: 'Cancelled reservations cannot be paid',
  DZ404: 'Unknown customer id',
  DZ501: 'Unknown payment id',
  DZ502: 'Illegal payment status transition / immutable field',
  DZ503: 'Paid amount would exceed reservation total',
  DZ504: 'Currency mismatch',
  DZ505: 'Refund amount <= 0 or above refundable balance',
  DZ601: 'WPoint is not a valid stop/endpoint of the trip',
  DZ602: 'WPoint is referenced by reservations',
  DZ603: 'Pickup must come before dropoff on the trajectory',
};

export interface DomainErrorInfo {
  sqlstate: string;
  description: string;
  message: string;
}

/** Extract the DZxxx domain error from a thrown DB error (works with both transports). */
export function explainDomainError(err: unknown): DomainErrorInfo | null {
  const code = (err as { code?: unknown })?.code;
  let sqlstate: string | undefined;
  if (typeof code === 'string' && /^DZ\d{3}$/.test(code)) sqlstate = code;
  else if (err instanceof Error) sqlstate = /DZ\d{3}/.exec(err.message)?.[0];
  if (!sqlstate || !(sqlstate in DOMAIN_ERRORS)) return null;
  return {
    sqlstate,
    description: DOMAIN_ERRORS[sqlstate],
    message: err instanceof Error ? err.message : String(err),
  };
}

// ── repository ────────────────────────────────────────────────────────────────

/**
 * DomainRepository — typed wrappers around the SQL functions/procedures of
 * delivery_domain v3 (create_trip, reserve, prices, payments, …) plus the
 * convenience views (v_trip, v_reservation, v_payment, v_refund_due).
 */
export class DomainRepository {
  readonly db: DBHelper;

  constructor(input: SupabaseConnection | DBHelper) {
    this.db = input instanceof DBHelper ? input : new DBHelper(input);
  }

  // ── administrative registry ────────────────────────────────────────────────

  async resolveWilaya(name: string): Promise<number | null> {
    return this.db.callScalar<number | null>('resolve_wilaya', name);
  }

  async resolveDaira(wilayaId: number, name: string): Promise<number | null> {
    return this.db.callScalar<number | null>('resolve_daira', wilayaId, name);
  }

  async resolveCommune(wilayaId: number, name: string): Promise<number | null> {
    return this.db.callScalar<number | null>('resolve_commune', wilayaId, name);
  }

  async getDairas(wilayaName: string): Promise<DairaRow[]> {
    return this.db.callFunction<DairaRow>('get_dairas', wilayaName);
  }

  async getCommunes(wilayaName: string): Promise<CommuneRow[]> {
    return this.db.callFunction<CommuneRow>('get_communes', wilayaName);
  }

  async getDomainErrors(): Promise<QueryRow[]> {
    return this.db.raw('select * from v_domain_errors order by sqlstate');
  }

  /** Per-wilaya counts (dairas / communes / distinct postal codes) — v_wilaya_overview. */
  async wilayaOverview(): Promise<WilayaOverviewRow[]> {
    return this.db.select<WilayaOverviewRow>('v_wilaya_overview', { orderBy: 'id' });
  }

  // ── trajectory / wpoints ───────────────────────────────────────────────────

  async createTrajectory(name: string): Promise<string> {
    const id = await this.db.callScalar<string>('create_trajectory', name);
    if (!id) throw new Error('create_trajectory returned no id');
    return id;
  }

  async addWpoint(trajectoryId: string, wilayaName: string): Promise<string> {
    const id = await this.db.callScalar<string>('add_wpoint', trajectoryId, wilayaName);
    if (!id) throw new Error(`add_wpoint(${wilayaName}) returned no id`);
    return id;
  }

  async selectCommune(wpointId: string, communeName: string): Promise<void> {
    await this.db.callScalar('select_commune', wpointId, communeName);
  }

  /** Attach every commune of a daira to a wpoint; returns the number added. */
  async selectDaira(wpointId: string, dairaName: string): Promise<number> {
    return (await this.db.callScalar<number>('select_daira', wpointId, dairaName)) ?? 0;
  }

  /** Current commune selection of a wpoint, as ids (in insertion order). Daira is never stored — only resolved communes are. */
  async wpointCommuneIds(wpointId: string): Promise<number[]> {
    const rows = await this.db.raw<{ commune_id: number }>(
      'select commune_id from wpoint_commune where wpoint_id = $1 order by sort_key',
      [wpointId],
    );
    return rows.map((r) => r.commune_id);
  }

  /**
   * Replaces a wpoint's entire commune selection in one atomic statement
   * (diff: removes communes no longer selected, adds newly selected ones).
   * Used by the WPoint commune-picker modal's Confirm action — the modal
   * never calls the API while the user is just clicking around, only once,
   * with the final chosen set, so Cancel never needs a server round trip.
   *
   * The Wilaya itself is immutable and never touched here (trg_wpoint_guard
   * / DZ206) — every commune id is validated to belong to the wpoint's own
   * wilaya before anything is written, on top of the DB's own
   * (commune_id, wilaya_id) composite FK which would reject a mismatch anyway.
   */
  async setWpointCommunes(wpointId: string, communeIds: number[]): Promise<number> {
    const wp = await this.db.selectOne<{ wilaya_id: number }>('wpoint', { columns: ['wilaya_id'], where: { id: wpointId } });
    if (!wp) throw new Error('WPoint introuvable');

    const uniqueIds = Array.from(new Set(communeIds));
    if (uniqueIds.length === 0) {
      await this.db.raw('delete from wpoint_commune where wpoint_id = $1', [wpointId]);
      return 0;
    }

    const params: unknown[] = [wpointId, wp.wilaya_id, ...uniqueIds];
    const idPlaceholders = uniqueIds.map((_, i) => `$${i + 3}`).join(', ');

    const check = await this.db.raw<{ n: number }>(
      `select count(*)::int as n from commune where wilaya_id = $2 and id in (${idPlaceholders})`,
      params,
    );
    if ((check[0]?.n ?? 0) !== uniqueIds.length) {
      throw new Error("Une ou plusieurs communes ne correspondent pas à la wilaya de ce WPoint");
    }

    const keepValues = uniqueIds.map((_, i) => `($${i + 3}::int)`).join(', ');
    await this.db.raw(
      `with keep(commune_id) as (values ${keepValues}),
            del as (
              delete from wpoint_commune
               where wpoint_id = $1
                 and commune_id not in (select commune_id from keep)
            )
       insert into wpoint_commune (wpoint_id, wilaya_id, commune_id)
       select $1, $2, k.commune_id from keep k
       on conflict (wpoint_id, commune_id) do nothing`,
      params,
    );
    return uniqueIds.length;
  }

  /** True if this wpoint is used as a stop by at least one trip (deleting it would cascade and silently break that trip). */
  async wpointHasTripStops(wpointId: string): Promise<boolean> {
    const rows = await this.db.raw<{ one: number }>('select 1 as one from trip_stop where wpoint_id = $1 limit 1', [wpointId]);
    return rows.length > 0;
  }

  /**
   * Removes a stop from a trajectory. Callers must first check
   * `wpointHasTripStops` themselves and refuse the request if it's in use —
   * the FK from trip_stop to wpoint is ON DELETE CASCADE (so the DB itself
   * won't block this), which would otherwise silently drop stops/prices from
   * an existing trip.
   */
  async deleteWpoint(trajectoryId: string, wpointId: string): Promise<void> {
    await this.db.raw('delete from wpoint where id = $1 and trajectory_id = $2', [wpointId, trajectoryId]);
  }

  /**
   * Re-ranks every stop of a trajectory to match `orderedIds` (position
   * 1..N, in that order). Must be given the trajectory's *entire* current
   * wpoint set — no partial reorder — so the result stays a contiguous,
   * strictly-positive, gap-free sequence. Implemented as a single UPDATE
   * statement: `wpoint_traj_position_uk` is DEFERRABLE INITIALLY IMMEDIATE,
   * which Postgres only (re)checks at the end of the statement, so
   * intermediate/duplicate positions mid-reorder never trip the constraint.
   */
  async reorderWpoints(trajectoryId: string, orderedIds: string[]): Promise<void> {
    const existing = await this.db.raw<{ id: string }>('select id from wpoint where trajectory_id = $1', [trajectoryId]);
    const existingIds = new Set(existing.map((r) => r.id));
    const uniqueOrdered = new Set(orderedIds);
    if (
      orderedIds.length === 0 ||
      uniqueOrdered.size !== orderedIds.length ||
      uniqueOrdered.size !== existingIds.size ||
      !orderedIds.every((id) => existingIds.has(id))
    ) {
      throw new Error("La liste de réordonnancement doit contenir exactement les arrêts actuels de la trajectoire, sans doublon ni omission");
    }
    const params: unknown[] = [trajectoryId];
    const valueRows = orderedIds.map((id, idx) => {
      params.push(id);
      const idParam = params.length;
      params.push(idx + 1);
      const posParam = params.length;
      return `($${idParam}::uuid, $${posParam}::int)`;
    });
    await this.db.raw(
      `update wpoint as w set position = v.pos
         from (values ${valueRows.join(', ')}) as v(id, pos)
        where w.id = v.id and w.trajectory_id = $1`,
      params,
    );
  }

  async getTrajectoryId(name: string): Promise<string | null> {
    return this.db.callScalar<string | null>('get_trajectory_id', name);
  }

  /** Trajectory JSON record ({name, wpoints:[{wilaya, communes}]}) by name or id. */
  async getTrajectoryRecord(nameOrId: string): Promise<Record<string, unknown> | null> {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(nameOrId);
    const rows = await this.db.raw<{ trajectory_to_record: Record<string, unknown> }>(
      `select * from trajectory_to_record($1::${isUuid ? 'uuid' : 'text'})`,
      [nameOrId],
    );
    return rows[0]?.trajectory_to_record ?? null;
  }

  async wpointToRecord(wpointId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.db.raw<{ wpoint_to_record: Record<string, unknown> }>(
      'select * from wpoint_to_record($1::uuid)',
      [wpointId],
    );
    return rows[0]?.wpoint_to_record ?? null;
  }

  // ── pricing ────────────────────────────────────────────────────────────────

  /** Set/update a default (template) price on a trajectory. */
  async setDefaultTripPrice(p: SetDefaultTripPriceParams): Promise<void> {
    await this.db.callProcedure(
      'sp_set_default_trip_price',
      p.trajectoryId,
      p.fromWpointId,
      p.toWpointId,
      p.price,
      p.minPrice ?? null,
      p.maxPrice ?? null,
      p.currency ?? 'DZD',
      p.notes ?? null,
    );
  }

  /** Set/update the actual price for one FROM→TO pair on a trip. */
  async setTripPrice(p: SetTripPriceParams): Promise<void> {
    await this.db.callProcedure(
      'sp_set_trip_price',
      p.tripId,
      p.fromWpointId,
      p.toWpointId,
      p.price,
      p.minPrice ?? null,
      p.maxPrice ?? null,
      p.currency ?? null,
      p.notes ?? null,
    );
  }

  /** Copy default prices onto a trip (only for pairs that are real stops). */
  async populateTripPricesFromDefaults(tripId: string, overwrite = false): Promise<void> {
    await this.db.callProcedure('sp_populate_trip_prices_from_defaults', tripId, overwrite);
  }

  // ── trips ──────────────────────────────────────────────────────────────────

  /** create_trip(…) → trip uuid. The trip is NOT published yet. */
  async createTrip(p: CreateTripParams): Promise<string> {
    const id = await this.db.callScalar<string>(
      'create_trip',
      p.trajectoryId,
      iso(p.departureAt),
      p.capacity,
      p.seatPrice,
      iso(p.arrivalEta),
      p.driverId ?? null,
      p.vehicleId ?? null,
      p.notes ?? null,
    );
    if (!id) throw new Error('create_trip returned no id');
    return id;
  }

  async addTripStop(tripId: string, wpointId: string, eta?: string | Date | null): Promise<void> {
    await this.db.callScalar('add_trip_stop', tripId, wpointId, iso(eta));
  }

  /** Create trip_stop rows for every wpoint of the trajectory; returns count added. */
  async populateTripStops(tripId: string): Promise<number> {
    return (await this.db.callScalar<number>('populate_trip_stops', tripId)) ?? 0;
  }

  async publishTrip(tripId: string): Promise<void> {
    await this.db.callProcedure('sp_publish_trip', tripId);
  }

  async startTrip(tripId: string): Promise<void> {
    await this.db.callScalar('start_trip', tripId);
  }

  async completeTrip(tripId: string): Promise<void> {
    await this.db.callScalar('complete_trip', tripId);
  }

  async cancelTrip(tripId: string): Promise<void> {
    await this.db.callProcedure('sp_cancel_trip', tripId);
  }

  async closeTrip(tripId: string): Promise<void> {
    await this.db.callProcedure('sp_close_trip', tripId);
  }

  async seatsAvailable(tripId: string): Promise<number | null> {
    return this.db.callScalar<number | null>('seats_available', tripId);
  }

  async hasActiveReservations(tripId: string): Promise<boolean> {
    return (await this.db.callScalar<boolean>('trip_has_active_reservations', tripId)) === true;
  }

  async listTrips(where?: Where, limit?: number): Promise<TripViewRow[]> {
    return this.db.select<TripViewRow>('v_trip', { where, orderBy: 'departure_at desc', limit });
  }

  async getTrip(tripId: string): Promise<TripViewRow | null> {
    return this.db.selectOne<TripViewRow>('v_trip', { where: { id: tripId } });
  }

  // ── customers / reservations / payments ────────────────────────────────────

  async createCustomer(fullName: string, phone: string, email?: string | null): Promise<string> {
    const id = await this.db.callScalar<string>('create_customer', fullName, phone, email ?? null);
    if (!id) throw new Error('create_customer returned no id');
    return id;
  }

  async listCustomers(limit?: number): Promise<CustomerRow[]> {
    return this.db.select<CustomerRow>('customer', {
      columns: ['id', 'full_name', 'phone', 'email', 'nin', 'home_wilaya_id', 'home_commune_id', 'created_at'],
      orderBy: 'created_at desc',
      limit,
    });
  }

  async getCustomer(id: string): Promise<CustomerRow | null> {
    return this.db.selectOne<CustomerRow>('customer', {
      columns: ['id', 'full_name', 'phone', 'email', 'nin', 'home_wilaya_id', 'home_commune_id', 'created_at'],
      where: { id },
    });
  }

  // ── driver self-service (driver UI) ─────────────────────────────────────────

  async getDriverProfile(driverId: string): Promise<DriverProfileRow | null> {
    return this.db.selectOne<DriverProfileRow>('driver', {
      columns: ['id', 'full_name', 'nin', 'phone', 'email', 'address', 'vehicle_id'],
      where: { id: driverId },
    });
  }

  /** Editable self-service fields only — nin/nif stay admin-managed (identity documents). */
  async updateDriverProfile(
    driverId: string,
    data: { full_name?: string; phone?: string; email?: string | null; address?: string | null },
  ): Promise<DriverProfileRow | null> {
    const patch: Record<string, unknown> = {};
    if (data.full_name !== undefined) patch.full_name = data.full_name;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.email !== undefined) patch.email = data.email;
    if (data.address !== undefined) patch.address = data.address;
    if (Object.keys(patch).length === 0) return this.getDriverProfile(driverId);
    await this.db.update('driver', patch, { id: driverId });
    return this.getDriverProfile(driverId);
  }

  async getVehicle(vehicleId: string): Promise<Record<string, unknown> | null> {
    return this.db.selectOne('vehicle', {
      columns: ['id', 'matricule', 'seats', 'make', 'model', 'notes'],
      where: { id: vehicleId },
    });
  }

  /** Creates a new vehicle and sets it as this driver's own/usual vehicle. */
  async createDriverVehicle(
    driverId: string,
    data: { matricule: string; seats: number; make?: string | null; model?: string | null },
  ): Promise<Record<string, unknown>> {
    const vehicle = await this.db.insert('vehicle', data as Record<string, unknown>);
    await this.db.update('driver', { vehicle_id: (vehicle as { id: string }).id }, { id: driverId });
    return vehicle;
  }

  async updateVehicle(
    vehicleId: string,
    data: { matricule?: string; seats?: number; make?: string | null; model?: string | null },
  ): Promise<Record<string, unknown> | null> {
    const patch: Record<string, unknown> = {};
    if (data.matricule !== undefined) patch.matricule = data.matricule;
    if (data.seats !== undefined) patch.seats = data.seats;
    if (data.make !== undefined) patch.make = data.make;
    if (data.model !== undefined) patch.model = data.model;
    if (Object.keys(patch).length > 0) await this.db.update('vehicle', patch, { id: vehicleId });
    return this.getVehicle(vehicleId);
  }

  async listTrajectories(): Promise<Array<{ id: string; name: string; nb_wpoints: number; created_at: string }>> {
    return this.db.raw(
      `select t.id, t.name,
              (select count(*) from wpoint w where w.trajectory_id = t.id)::int as nb_wpoints,
              t.created_at
         from trajectory t order by t.name`,
    );
  }

  /** Reservations across every trip assigned to a given driver (optionally filtered by status). */
  async listReservationsForDriver(driverId: string, status?: string): Promise<DriverReservationRow[]> {
    const params: unknown[] = [driverId];
    let statusFilter = '';
    if (status) {
      params.push(status);
      statusFilter = ` and r.status = $2`;
    }
    return this.db.raw<DriverReservationRow>(
      `select r.id, r.code, r.status, r.seats, r.total_price, r.currency, r.notes, r.created_at,
              tr.id as trip_id, tr.code as trip_code, tr.departure_at, tj.name as trajectory_name,
              cs.full_name as customer_name, cs.phone as customer_phone,
              w1.nom_fr as pickup, w2.nom_fr as dropoff,
              w1.id as pickup_wilaya_id, w2.id as dropoff_wilaya_id,
              r.pickup_lat, r.pickup_lon, r.dropoff_lat, r.dropoff_lon
         from reservation r
         join trip tr        on tr.id = r.trip_id
         join trajectory tj  on tj.id = r.trajectory_id
         join customer cs    on cs.id = r.customer_id
         left join wpoint wp1 on wp1.id = r.pickup_wpoint_id
         left join wilaya w1  on w1.id = wp1.wilaya_id
         left join wpoint wp2 on wp2.id = r.dropoff_wpoint_id
         left join wilaya w2  on w2.id = wp2.wilaya_id
        where tr.driver_id = $1${statusFilter}
        order by r.created_at desc`,
      params,
    );
  }

  /** The driver_id of the trip a reservation belongs to (ownership check for confirm/decline). */
  async getReservationTripDriver(reservationId: string): Promise<string | null> {
    const rows = await this.db.raw<{ driver_id: string | null }>(
      `select tr.driver_id from reservation r join trip tr on tr.id = r.trip_id where r.id = $1`,
      [reservationId],
    );
    return rows[0]?.driver_id ?? null;
  }

  /** Passenger manifest (active + completed reservations) for one trip. */
  async getTripManifest(tripId: string): Promise<TripManifestRow[]> {
    return this.db.raw<TripManifestRow>(
      `select r.id, r.code, r.status, r.seats, r.total_price, r.currency, r.notes,
              cs.full_name as customer_name, cs.phone as customer_phone,
              w1.nom_fr as pickup, w2.nom_fr as dropoff,
              w1.id as pickup_wilaya_id, w2.id as dropoff_wilaya_id,
              r.pickup_lat, r.pickup_lon, r.dropoff_lat, r.dropoff_lon
         from reservation r
         join customer cs on cs.id = r.customer_id
         left join wpoint wp1 on wp1.id = r.pickup_wpoint_id
         left join wilaya w1  on w1.id = wp1.wilaya_id
         left join wpoint wp2 on wp2.id = r.dropoff_wpoint_id
         left join wilaya w2  on w2.id = wp2.wilaya_id
        where r.trip_id = $1 and r.status in ('pending','confirmed','completed')
        order by r.created_at`,
      [tripId],
    );
  }

  // ── GPS tracking (driver / vehicle last known location) ────────────────────

  async setDriverLocation(driverId: string, lat: number, lon: number): Promise<void> {
    await this.db.upsert(
      'driver_last_location',
      { driver_id: driverId, gps_lat: lat, gps_lon: lon, recorded_at: new Date().toISOString() },
      ['driver_id'],
    );
  }

  async getDriverLocation(driverId: string): Promise<LastLocationRow | null> {
    return this.db.selectOne<LastLocationRow>('driver_last_location', { where: { driver_id: driverId } });
  }

  async setVehicleLocation(vehicleId: string, lat: number, lon: number): Promise<void> {
    await this.db.upsert(
      'vehicle_last_location',
      { vehicle_id: vehicleId, gps_lat: lat, gps_lon: lon, recorded_at: new Date().toISOString() },
      ['vehicle_id'],
    );
  }

  async getVehicleLocation(vehicleId: string): Promise<LastLocationRow | null> {
    return this.db.selectOne<LastLocationRow>('vehicle_last_location', { where: { vehicle_id: vehicleId } });
  }

  /** Latest known position of every driver/vehicle, for a tracking dashboard. */
  async listTracking(): Promise<
    Array<{
      driver_id: string | null;
      driver_name: string | null;
      vehicle_id: string | null;
      vehicle_matricule: string | null;
      gps_lat: string | null;
      gps_lon: string | null;
      recorded_at: string | null;
      kind: 'driver' | 'vehicle';
    }>
  > {
    return this.db.raw(
      `select d.id as driver_id, d.full_name as driver_name, null::uuid as vehicle_id, null as vehicle_matricule,
              dl.gps_lat, dl.gps_lon, dl.recorded_at, 'driver' as kind
         from driver d join driver_last_location dl on dl.driver_id = d.id
        union all
       select null as driver_id, null as driver_name, v.id as vehicle_id, v.matricule as vehicle_matricule,
              vl.gps_lat, vl.gps_lon, vl.recorded_at, 'vehicle' as kind
         from vehicle v join vehicle_last_location vl on vl.vehicle_id = v.id
        order by recorded_at desc`,
    );
  }

  /** reserve(…) → reservation uuid. Requires a published, scheduled, future trip. */
  async reserve(p: ReserveParams): Promise<string> {
    const id = await this.db.callScalar<string>(
      'reserve',
      p.tripId,
      p.customerId,
      p.seats,
      p.pickupWpointId ?? null,
      p.dropoffWpointId ?? null,
      p.notes ?? null,
    );
    if (!id) throw new Error('reserve returned no id');
    return id;
  }

  /**
   * Optional precise pickup/dropoff pin the customer dropped on a map at
   * booking time — stored separately from the wilaya-level wpoint, which
   * stays the pricing source of truth. Any field left undefined is untouched.
   */
  async setReservationGeo(
    reservationId: string,
    geo: { pickupLat?: number | null; pickupLon?: number | null; dropoffLat?: number | null; dropoffLon?: number | null },
  ): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (geo.pickupLat !== undefined) patch.pickup_lat = geo.pickupLat;
    if (geo.pickupLon !== undefined) patch.pickup_lon = geo.pickupLon;
    if (geo.dropoffLat !== undefined) patch.dropoff_lat = geo.dropoffLat;
    if (geo.dropoffLon !== undefined) patch.dropoff_lon = geo.dropoffLon;
    if (Object.keys(patch).length === 0) return;
    await this.db.update('reservation', patch, { id: reservationId });
  }

  async confirmReservation(reservationId: string): Promise<void> {
    await this.db.callScalar('confirm_reservation', reservationId);
  }

  async cancelReservation(reservationId: string): Promise<void> {
    await this.db.callScalar('cancel_reservation', reservationId);
  }

  async amountPaid(reservationId: string): Promise<string> {
    return (await this.db.callScalar<string>('amount_paid', reservationId)) ?? '0';
  }

  async recordPayment(p: RecordPaymentParams): Promise<string> {
    const id = await this.db.callScalar<string>(
      'record_payment',
      p.reservationId,
      p.amount,
      p.method,
      p.reference ?? null,
    );
    if (!id) throw new Error('record_payment returned no id');
    return id;
  }

  async settlePayment(paymentId: string): Promise<void> {
    await this.db.callScalar('settle_payment', paymentId);
  }

  async refundPayment(paymentId: string, amount?: number | string | null): Promise<void> {
    await this.db.callScalar('refund_payment', paymentId, amount ?? null);
  }

  async listReservations(where?: Where, limit?: number): Promise<ReservationViewRow[]> {
    return this.db.select<ReservationViewRow>('v_reservation', { where, orderBy: 'created_at desc', limit });
  }

  async getReservation(reservationId: string): Promise<ReservationViewRow | null> {
    return this.db.selectOne<ReservationViewRow>('v_reservation', { where: { id: reservationId } });
  }

  async listPayments(where?: Where, limit?: number): Promise<PaymentViewRow[]> {
    return this.db.select<PaymentViewRow>('v_payment', { where, orderBy: 'created_at desc', limit });
  }

  /** Cancelled reservations that still have money to give back. */
  async refundsDue(): Promise<RefundDueRow[]> {
    return this.db.select<RefundDueRow>('v_refund_due');
  }
}

function iso(d: string | Date | null | undefined): string | null {
  if (d === null || d === undefined || d === '') return null;
  return d instanceof Date ? d.toISOString() : d;
}
