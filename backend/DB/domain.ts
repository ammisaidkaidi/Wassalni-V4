import type { QueryRow, SupabaseConnection } from './connection';
import { DBHelper, type Where } from './DBHelper';
import { WILAYA_CENTROIDS } from './wilayaCentroids';

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

/**
 * Payment-level refund worklist row (Task 1.4) — one actionable row per
 * still-refundable payment, instead of RefundDueRow's one row per
 * reservation. Lets the admin UI put a "Rembourser" button directly next to
 * the exact payment it applies to, with the reservation/customer context
 * that was previously only visible by cross-referencing the payments table.
 */
export interface RefundWorklistRow {
  payment_id: string;
  payment_code: string;
  payment_status: string;
  reservation_id: string;
  reservation_code: string;
  customer_name: string;
  customer_phone: string;
  trip_code: string;
  departure_at: string;
  amount: string;
  refunded_amount: string;
  refund_due: string;
  paid_at: string | null;
}


export interface CustomerRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  nin: string | null;
  nif: string | null;
  si: string | null;
  address: string | null;
  home_wilaya_id: number | null;
  home_commune_id: number | null;
  gps_lat: string | null;
  gps_lon: string | null;
  created_at: string;
  no_show_count: number;
  flagged_at: string | null;
}

const CUSTOMER_PROFILE_COLS = [
  'id',
  'full_name',
  'phone',
  'email',
  'nin',
  'nif',
  'si',
  'address',
  'home_wilaya_id',
  'home_commune_id',
  'gps_lat',
  'gps_lon',
  'created_at',
  'no_show_count',
  'flagged_at',
];

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

/** One row per boarding/alighting passenger at a stop manifest entry (Task 5.2). */
export interface StopManifestPassenger {
  reservation_id: string;
  code: string;
  customer_name: string;
  seats: number;
}

/** Per-stop boarding/alighting/seat-count/remaining-capacity breakdown (Task 5.2). */
export interface StopManifestEntry {
  wpoint_id: string;
  position: number;
  wpoint_name: string;
  wilaya_name: string;
  boarding: StopManifestPassenger[];
  alighting: StopManifestPassenger[];
  seats_entering: number;
  seats_leaving: number;
  seats_aboard_after: number;
  remaining_capacity: number;
}

/** Why no live ETA could be computed for a stop — never fabricate one. */
export type EtaUnavailableReason = 'not_in_progress' | 'no_location' | 'stale_location' | 'no_reference_coordinates';

export interface StopEtaEntry {
  wpoint_id: string;
  position: number;
  wpoint_name: string;
  wilaya_name: string;
  eta: string | null;
  distance_km: number | null;
  reason: EtaUnavailableReason | null;
}

export interface TripEtaResult {
  /** Seconds since the last GPS ping used for this estimate, or null if none exists. */
  position_age_seconds: number | null;
  stops: StopEtaEntry[];
}

export interface NoShowEventRow {
  id: string;
  trip_id: string | null;
  reservation_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  driver_id: string | null;
  driver_name: string | null;
  kind: 'customer' | 'driver';
  notes: string | null;
  recorded_at: string;
  trip_code: string | null;
}

export interface KycDocumentRow {
  id: string;
  driver_id: string;
  driver_name: string;
  doc_type: 'identity' | 'license' | 'vehicle_registration' | 'insurance';
  file_path: string;
  file_name: string;
  mime_type: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface DriverProfileRow {
  id: string;
  full_name: string;
  nin: string;
  phone: string;
  email: string | null;
  address: string | null;
  vehicle_id: string | null;
  no_show_count: number;
  flagged_at: string | null;
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

/**
 * Typed application-level validation error (Task 1.5) — thrown by domain
 * methods that validate something in TypeScript before it would otherwise
 * reach the database (e.g. a commune/wilaya pairing check that mirrors a
 * composite FK). Carries a machine-readable `code` so callers can branch on
 * `instanceof DomainValidationError` + `.code` instead of matching on
 * `.message` substrings, which breaks silently if the message wording ever
 * changes. Distinct from the DZxxx errors below, which come from the
 * database itself (triggers/functions) via their SQLSTATE.
 */
export class DomainValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainValidationError';
  }
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
  DZ604: 'Commune is not among the ones configured for this stop',
  DZ605: 'GPS coordinates fall outside Algeria',
  DZ309: 'Driver no-show can only be recorded on a trip that has not started',
  DZ701: 'Unknown KYC document id',
  DZ702: 'KYC document has already been approved or rejected',
  DZ703: 'A rejection reason is required',
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
      throw new DomainValidationError('BAD_COMMUNE', "Une ou plusieurs communes ne correspondent pas à la wilaya de ce WPoint");
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

  /**
   * Remaining capacity. With no wpoints given: the tightest bottleneck
   * across the whole route (trip-level overview). With both given: the
   * remaining capacity for that exact pickup->dropoff segment (Task 2.3) —
   * what search results and the booking UI should actually show once a
   * passenger's segment is known.
   */
  async seatsAvailable(tripId: string, fromWpointId?: string | null, toWpointId?: string | null): Promise<number | null> {
    return this.db.callScalar<number | null>('seats_available', tripId, fromWpointId ?? null, toWpointId ?? null);
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
      columns: CUSTOMER_PROFILE_COLS,
      orderBy: 'created_at desc',
      limit,
    });
  }

  async getCustomer(id: string): Promise<CustomerRow | null> {
    return this.db.selectOne<CustomerRow>('customer', {
      columns: CUSTOMER_PROFILE_COLS,
      where: { id },
    });
  }

  /**
   * Self-service profile update (customer editing their own record).
   * Mirrors updateDriverProfile's partial-patch shape. home_commune_id is
   * validated against home_wilaya_id the same way setWpointCommunes does —
   * the DB's (home_commune_id, home_wilaya_id) composite FK would reject a
   * mismatch anyway, but we check first so the route can surface a clear
   * 400 instead of a generic FK-violation 409.
   */
  async updateCustomerProfile(
    customerId: string,
    data: {
      full_name?: string;
      phone?: string;
      email?: string | null;
      nin?: string | null;
      nif?: string | null;
      address?: string | null;
      home_wilaya_id?: number | null;
      home_commune_id?: number | null;
      gps_lat?: number | null;
      gps_lon?: number | null;
    },
  ): Promise<CustomerRow | null> {
    const patch: Record<string, unknown> = {};
    for (const key of ['full_name', 'phone', 'email', 'nin', 'nif', 'address'] as const) {
      if (data[key] !== undefined) patch[key] = data[key];
    }

    // home_wilaya_id / home_commune_id are only ever meaningful together — if
    // either is part of this patch, resolve the pair against the current row
    // first so a partial patch (e.g. only commune changing) still validates.
    if (data.home_wilaya_id !== undefined || data.home_commune_id !== undefined) {
      const current = await this.db.selectOne<{ home_wilaya_id: number | null; home_commune_id: number | null }>(
        'customer',
        { columns: ['home_wilaya_id', 'home_commune_id'], where: { id: customerId } },
      );
      const wilayaId = data.home_wilaya_id !== undefined ? data.home_wilaya_id : current?.home_wilaya_id ?? null;
      const communeId = data.home_commune_id !== undefined ? data.home_commune_id : current?.home_commune_id ?? null;
      if (communeId !== null) {
        if (wilayaId === null) throw new DomainValidationError('BAD_COMMUNE', 'Une commune ne peut être renseignée sans sa wilaya');
        const check = await this.db.raw<{ n: number }>(
          'select count(*)::int as n from commune where id = $1 and wilaya_id = $2',
          [communeId, wilayaId],
        );
        if ((check[0]?.n ?? 0) !== 1) {
          throw new DomainValidationError('BAD_COMMUNE', 'Cette commune ne correspond pas à la wilaya sélectionnée');
        }
      }
      patch.home_wilaya_id = wilayaId;
      patch.home_commune_id = communeId;
    }

    if (data.gps_lat !== undefined || data.gps_lon !== undefined) {
      patch.gps_lat = data.gps_lat ?? null;
      patch.gps_lon = data.gps_lon ?? null;
    }

    if (Object.keys(patch).length === 0) return this.getCustomer(customerId);
    await this.db.update('customer', patch, { id: customerId });
    return this.getCustomer(customerId);
  }

  // ── driver self-service (driver UI) ─────────────────────────────────────────

  async getDriverProfile(driverId: string): Promise<DriverProfileRow | null> {
    return this.db.selectOne<DriverProfileRow>('driver', {
      columns: ['id', 'full_name', 'nin', 'phone', 'email', 'address', 'vehicle_id', 'no_show_count', 'flagged_at'],
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

  /**
   * Boarding/alighting manifest per stop (Task 5.2): for every stop on the
   * trip's trajectory, who boards there, who alights there, how many seats
   * that represents, and the running aboard-count / remaining capacity
   * immediately after that stop. Computed in TS from the ordered stop list
   * + each active reservation's pickup/dropoff wpoint — not duplicated SQL
   * logic, just a different read shape over the same rows getTripManifest
   * already reads.
   */
  async getTripStopManifest(tripId: string): Promise<StopManifestEntry[]> {
    const trip = await this.db.selectOne<{ capacity: number }>('trip', {
      where: { id: tripId },
      columns: ['capacity'],
    });
    if (!trip) return [];

    const stops = await this.db.raw<{ wpoint_id: string; position: number; wpoint_name: string; wilaya_name: string }>(
      `select ts.wpoint_id, wp.position, w.nom_fr as wpoint_name, w.nom_fr as wilaya_name
         from trip_stop ts
         join wpoint wp on wp.id = ts.wpoint_id
         join wilaya w  on w.id = wp.wilaya_id
        where ts.trip_id = $1
        order by wp.position`,
      [tripId],
    );

    const reservations = await this.db.raw<{
      id: string;
      code: string;
      seats: number;
      customer_name: string;
      pickup_wpoint_id: string | null;
      dropoff_wpoint_id: string | null;
    }>(
      `select r.id, r.code, r.seats, cs.full_name as customer_name,
              r.pickup_wpoint_id, r.dropoff_wpoint_id
         from reservation r
         join customer cs on cs.id = r.customer_id
        where r.trip_id = $1 and r.status in ('pending','confirmed','completed')`,
      [tripId],
    );

    let aboard = 0;
    return stops.map((stop) => {
      const boarding = reservations
        .filter((r) => r.pickup_wpoint_id === stop.wpoint_id)
        .map((r) => ({ reservation_id: r.id, code: r.code, customer_name: r.customer_name, seats: r.seats }));
      const alighting = reservations
        .filter((r) => r.dropoff_wpoint_id === stop.wpoint_id)
        .map((r) => ({ reservation_id: r.id, code: r.code, customer_name: r.customer_name, seats: r.seats }));
      const seats_entering = boarding.reduce((n, r) => n + r.seats, 0);
      const seats_leaving = alighting.reduce((n, r) => n + r.seats, 0);
      aboard = aboard - seats_leaving + seats_entering;
      return {
        wpoint_id: stop.wpoint_id,
        position: stop.position,
        wpoint_name: stop.wpoint_name,
        wilaya_name: stop.wilaya_name,
        boarding,
        alighting,
        seats_entering,
        seats_leaving,
        seats_aboard_after: aboard,
        remaining_capacity: trip.capacity - aboard,
      };
    });
  }

  // ── Live ETA (Task 4.3) ──────────────────────────────────────────────────

  /** Straight-line (haversine) distance in km between two lat/lon points. */
  private static haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** How old a GPS ping can be and still be trusted for an ETA estimate. */
  private static readonly ETA_STALE_SECONDS = 20 * 60;
  /** Assumed average intercity road speed (km/h), including stops — a rough
   *  heuristic in the absence of real route/traffic data; never presented
   *  as more precise than it is. */
  private static readonly ETA_ASSUMED_SPEED_KMH = 55;

  /**
   * Live ETA to every stop still on the trip, estimated from the driver's
   * (or failing that, the vehicle's) last known GPS ping and a straight-line
   * distance to each stop's wilaya chief-town coordinate — there is no
   * route-polyline data in this schema to do better. Deliberately returns
   * `eta: null` with a `reason` instead of fabricating a number whenever the
   * trip hasn't started, no location has ever been reported, the last
   * report is stale, or a wilaya has no reference coordinate.
   */
  async estimateTripEtas(tripId: string): Promise<TripEtaResult> {
    const trip = await this.db.selectOne<{ status: TripStatus; driver_id: string | null; vehicle_id: string | null }>(
      'trip',
      { where: { id: tripId }, columns: ['status', 'driver_id', 'vehicle_id'] },
    );
    const stops = await this.db.raw<{ wpoint_id: string; position: number; wpoint_name: string; wilaya_name: string; wilaya_code: string }>(
      `select ts.wpoint_id, wp.position, w.nom_fr as wpoint_name, w.nom_fr as wilaya_name, w.code as wilaya_code
         from trip_stop ts
         join wpoint wp on wp.id = ts.wpoint_id
         join wilaya w  on w.id = wp.wilaya_id
        where ts.trip_id = $1
        order by wp.position`,
      [tripId],
    );

    const bare = (reason: EtaUnavailableReason, positionAge: number | null): TripEtaResult => ({
      position_age_seconds: positionAge,
      stops: stops.map((s) => ({
        wpoint_id: s.wpoint_id,
        position: s.position,
        wpoint_name: s.wpoint_name,
        wilaya_name: s.wilaya_name,
        eta: null,
        distance_km: null,
        reason,
      })),
    });

    if (!trip || trip.status !== 'in_progress') return bare('not_in_progress', null);

    let loc: LastLocationRow | null = trip.driver_id ? await this.getDriverLocation(trip.driver_id) : null;
    if (!loc && trip.vehicle_id) loc = await this.getVehicleLocation(trip.vehicle_id);
    if (!loc) return bare('no_location', null);

    const ageSeconds = Math.max(0, Math.round((Date.now() - new Date(loc.recorded_at).getTime()) / 1000));
    if (ageSeconds > DomainRepository.ETA_STALE_SECONDS) return bare('stale_location', ageSeconds);

    const lat = Number(loc.gps_lat);
    const lon = Number(loc.gps_lon);
    const now = Date.now();

    return {
      position_age_seconds: ageSeconds,
      stops: stops.map((s) => {
        const centroid = WILAYA_CENTROIDS[s.wilaya_code];
        if (!centroid) {
          return {
            wpoint_id: s.wpoint_id,
            position: s.position,
            wpoint_name: s.wpoint_name,
            wilaya_name: s.wilaya_name,
            eta: null,
            distance_km: null,
            reason: 'no_reference_coordinates',
          };
        }
        const distanceKm = DomainRepository.haversineKm(lat, lon, centroid.lat, centroid.lon);
        const hours = distanceKm / DomainRepository.ETA_ASSUMED_SPEED_KMH;
        const eta = new Date(now + hours * 3_600_000).toISOString();
        return {
          wpoint_id: s.wpoint_id,
          position: s.position,
          wpoint_name: s.wpoint_name,
          wilaya_name: s.wilaya_name,
          eta,
          distance_km: Math.round(distanceKm * 10) / 10,
          reason: null,
        };
      }),
    };
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
   * Algeria's bounding box (generously padded past the actual border so
   * legitimate border-area points are never falsely rejected) — the one
   * authoritative place "is this GPS point even plausibly in Algeria?" is
   * decided (Task 4.1's "reject invalid geographic coordinates"). Anything
   * outside this box is almost certainly a client bug (wrong field order,
   * (0,0), a different country) rather than a real pickup/dropoff point.
   */
  private static readonly ALGERIA_BBOX = { minLat: 18.5, maxLat: 38.0, minLon: -9.0, maxLon: 12.5 };

  private assertInAlgeria(lat: number | null | undefined, lon: number | null | undefined, label: string): void {
    if (lat == null || lon == null) return;
    const b = DomainRepository.ALGERIA_BBOX;
    if (lat < b.minLat || lat > b.maxLat || lon < b.minLon || lon > b.maxLon) {
      throw new DomainValidationError('DZ605', `${label}: coordonnées GPS hors d'Algérie (${lat}, ${lon})`);
    }
  }

  /**
   * Optional precise pickup/dropoff pin the customer dropped on a map at
   * booking time — stored separately from the wilaya-level wpoint, which
   * stays the pricing source of truth. Any field left undefined is untouched.
   * Task 4.1: rejects coordinates outside Algeria before writing them.
   */
  async setReservationGeo(
    reservationId: string,
    geo: { pickupLat?: number | null; pickupLon?: number | null; dropoffLat?: number | null; dropoffLon?: number | null },
  ): Promise<void> {
    if (geo.pickupLat !== undefined) this.assertInAlgeria(geo.pickupLat, geo.pickupLon, 'Point de montée');
    if (geo.dropoffLat !== undefined) this.assertInAlgeria(geo.dropoffLat, geo.dropoffLon, 'Point de descente');
    const patch: Record<string, unknown> = {};
    if (geo.pickupLat !== undefined) patch.pickup_lat = geo.pickupLat;
    if (geo.pickupLon !== undefined) patch.pickup_lon = geo.pickupLon;
    if (geo.dropoffLat !== undefined) patch.dropoff_lat = geo.dropoffLat;
    if (geo.dropoffLon !== undefined) patch.dropoff_lon = geo.dropoffLon;
    if (Object.keys(patch).length === 0) return;
    await this.db.update('reservation', patch, { id: reservationId });
  }

  /**
   * Task 4.1 — attach/validate a precise pickup/dropoff Commune for a
   * reservation. All real validation (wilaya match + wpoint_commune curated
   * subset, when configured) happens server-side in set_reservation_communes()
   * — this is a thin pass-through so that validation runs even for calls
   * that don't go through this particular TS method.
   */
  async setReservationCommunes(
    reservationId: string,
    communes: { pickupCommuneId?: number | null; dropoffCommuneId?: number | null },
  ): Promise<void> {
    if (communes.pickupCommuneId == null && communes.dropoffCommuneId == null) return;
    await this.db.callScalar(
      'set_reservation_communes',
      reservationId,
      communes.pickupCommuneId ?? null,
      communes.dropoffCommuneId ?? null,
    );
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

  /**
   * Payment-level refund worklist — same business rule v_refund_due already
   * encodes (cancelled reservation + a payment still holding a refundable
   * balance), just expressed per-payment so each row carries the exact
   * payment_id the admin needs to act on, plus trip/customer context.
   * payment_refund_consistency already guarantees amount > refunded_amount
   * whenever status is 'paid'/'partially_refunded' — the extra filter below
   * is a defensive no-op, not a second source of truth for that rule.
   */
  async refundWorklist(): Promise<RefundWorklistRow[]> {
    return this.db.raw<RefundWorklistRow>(
      `select p.id as payment_id, p.code as payment_code, p.status as payment_status,
              r.id as reservation_id, r.code as reservation_code,
              cs.full_name as customer_name, cs.phone as customer_phone,
              tr.code as trip_code, tr.departure_at,
              p.amount, p.refunded_amount,
              (p.amount - p.refunded_amount) as refund_due,
              p.paid_at
         from payment p
         join reservation r on r.id = p.reservation_id
         join customer cs   on cs.id = r.customer_id
         join trip tr       on tr.id = r.trip_id
        where r.status = 'cancelled'
          and p.status in ('paid', 'partially_refunded')
          and p.amount - p.refunded_amount > 0
        order by p.paid_at nulls last, p.created_at`,
    );
  }

  // ── No-show strikes (Task 5.3) ──────────────────────────────────────────────

  /** Admin-configurable strike threshold; defaults to 3 if never set. */
  async getNoShowThreshold(): Promise<number> {
    const row = await this.db.selectOne<{ value: string }>('app_setting', {
      where: { key: 'no_show_strike_threshold' },
      columns: ['value'],
    });
    return row ? Number(row.value) : 3;
  }

  async setNoShowThreshold(value: number): Promise<void> {
    if (!Number.isInteger(value) || value < 1) {
      throw new DomainValidationError('DZ001', 'Le seuil doit être un entier positif');
    }
    await this.db.upsert('app_setting', { key: 'no_show_strike_threshold', value: String(value), updated_at: new Date().toISOString() }, ['key']);
  }

  /** Flag-only (Task 5.3 scope decision): records the occurrence and lets the
   *  existing trg_no_show_event_apply trigger bump the counter / flagged_at
   *  on customer or driver. No automatic booking/publishing restriction is
   *  applied — flags are surfaced to admins, who decide what to do. */
  async recordDriverNoShow(tripId: string, notes?: string | null): Promise<void> {
    await this.db.callScalar('record_driver_no_show', tripId, notes ?? null);
  }

  async listNoShowEvents(filter?: { kind?: 'customer' | 'driver'; customerId?: string; driverId?: string }): Promise<NoShowEventRow[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter?.kind) {
      params.push(filter.kind);
      where.push(`e.kind = $${params.length}`);
    }
    if (filter?.customerId) {
      params.push(filter.customerId);
      where.push(`e.customer_id = $${params.length}`);
    }
    if (filter?.driverId) {
      params.push(filter.driverId);
      where.push(`e.driver_id = $${params.length}`);
    }
    const whereSql = where.length ? `where ${where.join(' and ')}` : '';
    return this.db.raw<NoShowEventRow>(
      `select e.id, e.trip_id, e.reservation_id, e.customer_id, cs.full_name as customer_name,
              e.driver_id, d.full_name as driver_name, e.kind, e.notes, e.recorded_at,
              tr.code as trip_code
         from no_show_event e
         left join customer cs on cs.id = e.customer_id
         left join driver d    on d.id  = e.driver_id
         left join trip tr     on tr.id = e.trip_id
         ${whereSql}
        order by e.recorded_at desc`,
      params,
    );
  }

  // ── Driver KYC (Task 6.1) ────────────────────────────────────────────────

  async submitKycDocument(
    driverId: string,
    docType: KycDocumentRow['doc_type'],
    file: { path: string; fileName: string; mimeType: string },
  ): Promise<string> {
    const row = await this.db.insert<{ id: string }>('kyc_document', {
      driver_id: driverId,
      doc_type: docType,
      file_path: file.path,
      file_name: file.fileName,
      mime_type: file.mimeType,
    });
    return row.id;
  }

  private static readonly KYC_SELECT = `
    select k.id, k.driver_id, dr.full_name as driver_name, k.doc_type, k.file_path, k.file_name, k.mime_type,
           k.status, k.rejection_reason, k.reviewed_by, au.full_name as reviewed_by_name,
           k.reviewed_at, k.submitted_at, k.updated_at
      from kyc_document k
      join driver dr on dr.id = k.driver_id
      left join app_user au on au.id = k.reviewed_by`;

  async getKycDocument(id: string): Promise<KycDocumentRow | null> {
    const rows = await this.db.raw<KycDocumentRow>(`${DomainRepository.KYC_SELECT} where k.id = $1`, [id]);
    return rows[0] ?? null;
  }

  async listKycDocumentsForDriver(driverId: string): Promise<KycDocumentRow[]> {
    return this.db.raw<KycDocumentRow>(`${DomainRepository.KYC_SELECT} where k.driver_id = $1 order by k.submitted_at desc`, [driverId]);
  }

  async listKycDocumentsAdmin(status?: KycDocumentRow['status']): Promise<KycDocumentRow[]> {
    const sql = status
      ? `${DomainRepository.KYC_SELECT} where k.status = $1 order by k.submitted_at`
      : `${DomainRepository.KYC_SELECT} order by k.submitted_at desc`;
    return this.db.raw<KycDocumentRow>(sql, status ? [status] : []);
  }

  async approveKycDocument(id: string, adminId: string): Promise<void> {
    await this.db.callScalar('kyc_approve', id, adminId);
  }

  async rejectKycDocument(id: string, adminId: string, reason: string): Promise<void> {
    await this.db.callScalar('kyc_reject', id, adminId, reason);
  }
}

function iso(d: string | Date | null | undefined): string | null {
  if (d === null || d === undefined || d === '') return null;
  return d instanceof Date ? d.toISOString() : d;
}
