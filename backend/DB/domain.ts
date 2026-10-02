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
