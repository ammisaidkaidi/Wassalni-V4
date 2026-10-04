import type { QueryRow, SupabaseConnection } from './connection';
import { DBHelper, type Where } from './DBHelper';
import { WILAYA_CENTROIDS } from './wilayaCentroids';

// ── domain types ──────────────────────────────────────────────────────────────

export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type PaymentMethod = 'cash' | 'cib' | 'edahabia' | 'bank_transfer' | 'card';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'expired';

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
  gateway: string | null;
  gateway_transaction_id: string | null;
  failure_reason: string | null;
  expires_at: string | null;
}

/** Task 7.4 — a refund ledger row still waiting on a human (exclusively the
 *  cash-payment case; a gateway refund auto-executes and never appears
 *  here). Source: v_refund_due (refund table, status='pending'). */
export interface RefundDueRow {
  refund_id: string;
  payment_id: string;
  reservation_id: string;
  refund_due: string;
  status: RefundStatus;
  policy_pct: string | null;
  initiated_by: 'system' | 'admin';
  created_at: string;
  reservation_code: string;
  customer_name: string;
  customer_phone: string;
}

export type RefundStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

/**
 * Payment-level refund worklist row (Task 1.4, reworked for Task 7.4) — one
 * row per refund *ledger entry* (not just "any cancelled+paid reservation",
 * which stopped being a correct heuristic once partial-refund policies
 * existed) with the trip/customer context the admin UI needs.
 */
export interface RefundWorklistRow {
  refund_id: string;
  payment_id: string;
  payment_code: string;
  reservation_id: string;
  reservation_code: string;
  customer_name: string;
  customer_phone: string;
  trip_code: string;
  departure_at: string;
  amount: string;
  status: RefundStatus;
  policy_pct: string | null;
  initiated_by: 'system' | 'admin';
  gateway: string | null;
  failure_reason: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface PayoutLedgerRow {
  id: string;
  driver_id: string;
  trip_id: string | null;
  reservation_id: string | null;
  payment_id: string | null;
  entry_type: 'earning' | 'refund_adjustment';
  gross_amount: string;
  commission_pct: string;
  commission_amount: string;
  net_amount: string;
  payout_batch_id: string | null;
  created_at: string;
  reservation_code?: string | null;
  trip_code?: string | null;
}

export interface PayoutBatchRow {
  id: string;
  driver_id: string;
  driver_name?: string;
  period_start: string;
  period_end: string;
  total_amount: string;
  status: 'pending' | 'paid' | 'failed';
  reference: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface DriverEarningsSummary {
  gross_revenue: string;
  commission: string;
  refunds: string;
  net_earnings: string;
  pending_payout: string;
  paid_out: string;
}


// ── Wallet (Task 9.3) ─────────────────────────────────────────────────────────

export type WalletEntryType = 'refund_credit' | 'promo_credit' | 'referral_credit' | 'booking_debit' | 'admin_adjustment';

export interface WalletEntryRow {
  id: string;
  customer_id: string;
  entry_type: WalletEntryType;
  amount: string;
  reservation_id: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

// ── Promo codes (Task 9.2) ───────────────────────────────────────────────────

export interface PromoCodeRow {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  min_amount: string;
  max_uses_total: number | null;
  max_uses_per_customer: number;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface PromoRedemptionRow {
  id: string;
  promo_code_id: string;
  code?: string;
  customer_id: string;
  reservation_id: string | null;
  discount_amount: string;
  created_at: string;
}

// ── Referral program (Task 9.4) ──────────────────────────────────────────────

export interface ReferralSummary {
  referral_code: string;
  referred_by_customer_id: string | null;
  total_referred: number;
  total_rewarded: string;
}

export interface ReferralRewardRow {
  id: string;
  referrer_id: string;
  referred_id: string;
  referred_name?: string;
  trigger_reservation_id: string | null;
  reward_amount: string;
  status: 'pending' | 'paid';
  created_at: string;
}

// ── PDF receipts (Task 9.5) ──────────────────────────────────────────────────

export interface ReceiptHeader {
  id: string;
  code: string;
  seats: number;
  total_price: string;
  currency: string;
  created_at: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  trip_code: string;
  departure_at: string;
  trajectory_name: string;
}

export interface ReceiptPaymentLine {
  id: string;
  code: string;
  amount: string;
  refunded_amount: string;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}

export interface ReceiptRefundLine {
  id: string;
  payment_id: string;
  payment_code: string;
  amount: string;
  status: RefundStatus;
  initiated_by: 'system' | 'admin';
  created_at: string;
  processed_at: string | null;
}

export interface ReceiptData {
  header: ReceiptHeader;
  payments: ReceiptPaymentLine[];
  refunds: ReceiptRefundLine[];
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
  rating_avg: string | null;
  rating_count: number;
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
  'rating_avg',
  'rating_count',
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

/** Task 6.2 — vehicle inspection submission/review record. */
export interface VehicleInspectionRow {
  id: string;
  vehicle_id: string;
  vehicle_matricule: string;
  submitted_by_driver: string | null;
  inspection_date: string;
  expiry_date: string;
  maintenance_status: 'ok' | 'needs_service' | 'out_of_service';
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  notes: string | null;
  approval_state: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RatingDirection = 'customer_to_driver' | 'driver_to_customer';

/** Task 6.3 — a single rating (either direction). */
export interface RatingRow {
  id: string;
  reservation_id: string;
  reservation_code: string;
  direction: RatingDirection;
  rater_customer_id: string | null;
  rater_customer_name: string | null;
  rater_driver_id: string | null;
  rater_driver_name: string | null;
  ratee_customer_id: string | null;
  ratee_customer_name: string | null;
  ratee_driver_id: string | null;
  ratee_driver_name: string | null;
  stars: number;
  review: string | null;
  hidden_at: string | null;
  moderation_reason: string | null;
  moderated_by: string | null;
  created_at: string;
}

/** Task 6.4 — one row of the unified deterministic fraud-signal feed. */
export interface FraudSignalRow {
  signal_type: 'duplicate_nin' | 'duplicate_phone' | 'rapid_cancel_rebook' | 'repeated_no_show' | 'suspicious_payment' | 'account_burst';
  severity: 'low' | 'medium' | 'high';
  subject_type: 'customer' | 'driver';
  subject_id: string | null;
  subject_label: string;
  detail: string;
  detected_at: string;
}

/** Task 7.1/7.2 — one payment-gateway webhook delivery attempt (audit ledger). */
export interface PaymentGatewayEventRow {
  id: string;
  payment_id: string | null;
  gateway: string;
  gateway_event_id: string;
  event_type: 'payment.succeeded' | 'payment.failed';
  signature_valid: boolean;
  raw_payload: Record<string, unknown>;
  processing_result: 'processed' | 'duplicate' | 'rejected';
  processing_note: string | null;
  received_at: string;
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
  rating_avg: string | null;
  rating_count: number;
  trust_badge: boolean;
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

// ── Tasks 10.x-13.x (batch: waitlist, recurring trips, favorites, group
// bookings, accessibility, notifications, messaging, share links, SOS,
// admin audit/roles, analytics, scheduler) ─────────────────────────────────

export type WaitlistStatus = 'waiting' | 'promoted' | 'cancelled' | 'expired';
export interface WaitlistEntryRow {
  id: string;
  trip_id: string;
  customer_id: string;
  seats: number;
  pickup_wpoint_id: string | null;
  dropoff_wpoint_id: string | null;
  position: number;
  status: WaitlistStatus;
  reservation_id: string | null;
  created_at: string;
  promoted_at: string | null;
  cancelled_at: string | null;
}

export interface RecurringTemplateRow {
  id: string;
  trajectory_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  weekdays: number[];
  departure_time: string;
  capacity: number;
  seat_price: string;
  starts_on: string;
  ends_on: string | null;
  horizon_days: number;
  active: boolean;
  notes: string | null;
  last_generated_through: string | null;
  created_at: string;
}

export interface RecurringExceptionRow {
  id: string;
  template_id: string;
  exception_date: string;
  notes: string | null;
  created_at: string;
}

export interface FavoriteRouteRow {
  id: string;
  customer_id: string;
  origin_wpoint_id: string;
  destination_wpoint_id: string;
  notify: boolean;
  created_at: string;
}

export interface FavoriteDriverRow {
  id: string;
  customer_id: string;
  driver_id: string;
  notify: boolean;
  created_at: string;
}

export interface ReservationPassengerInput {
  full_name: string;
  phone?: string | null;
  fare_share?: number | null;
}
export interface ReservationPassengerRow extends ReservationPassengerInput {
  id: string;
  reservation_id: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  reservation_id: string;
  blocked_at: string | null;
  created_at: string;
}
export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_role: 'customer' | 'driver';
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface EmergencyContactRow {
  id: string;
  customer_id: string;
  full_name: string;
  phone: string;
  relationship: string | null;
  created_at: string;
}

export type SosStatus = 'open' | 'acknowledged' | 'resolved';
export interface SosEventRow {
  id: string;
  reservation_id: string | null;
  trip_id: string | null;
  triggered_by_role: 'customer' | 'driver';
  triggered_by_id: string;
  gps_lat: string | null;
  gps_lon: string | null;
  status: SosStatus;
  notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface AdminAuditLogRow {
  id: string;
  admin_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export interface AnalyticsSummary {
  revenue: string;
  refunds_total: string;
  bookings: number;
  cancellations: number;
  no_shows: number;
  occupancy_pct: string;
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
  DZ711: 'Unknown vehicle inspection record id',
  DZ712: 'Vehicle inspection record has already been approved or rejected',
  DZ713: 'A rejection reason is required',
  DZ714: 'Vehicle has no approved, unexpired inspection on file (or is marked out of service)',
  DZ721: 'Only a completed reservation can be rated',
  DZ722: 'This relationship has already been rated',
  DZ723: 'Rater does not match this reservation',
  DZ731: 'Unknown payment gateway transaction',
  DZ732: 'Webhook signature verification failed',
  DZ733: 'Payment intent has already been resolved',
  DZ741: 'Unknown refund id',
  DZ742: 'Refund is not in a pending/processing state',
  DZ743: 'A failure reason is required to mark a refund as failed',
  DZ744: 'Only a failed refund can be retried',
  DZ751: 'Unknown promo code',
  DZ752: 'Promo code is not active',
  DZ753: 'Promo code is not within its valid date range',
  DZ754: 'Reservation amount is below the promo code minimum',
  DZ755: 'Promo code total usage limit reached',
  DZ756: 'You have already used this promo code the maximum number of times',
  DZ761: 'Wallet credit/debit amount must be positive',
  DZ762: 'Insufficient wallet balance',
  DZ771: 'Unknown referral code',
  DZ772: 'You cannot refer yourself',
  DZ773: 'This account already has a referrer on file',
  DZ781: 'Unknown payout batch id',
  DZ782: 'Payout batch has already been marked as paid',
  DZ783: 'No unbatched payout ledger entries in that period for this driver',
  DZ801: 'Unknown waitlist entry id',
  DZ802: 'Customer already has an active waitlist entry for this trip',
  DZ803: 'Illegal waitlist entry status transition',
  DZ804: 'Can only join the waitlist of a scheduled, published trip',
  DZ811: 'Unknown recurring trip template id',
  DZ812: 'Recurrence rule must select at least one weekday',
  DZ813: "Exception date is outside the template's generation window",
  DZ821: 'Unknown favorite id',
  DZ831: 'Number of named passengers must match the reserved seat count',
  DZ832: 'Each passenger needs a name',
  DZ841: 'Trip/vehicle cannot accommodate the requested service requirement',
  DZ851: 'Unknown conversation id',
  DZ852: 'You are not a participant in this conversation',
  DZ853: 'Message body cannot be empty',
  DZ854: 'Too many messages sent in a short period — please slow down',
  DZ861: 'Only the driver/customer of this reservation may request contact',
  DZ862: 'Unknown or invalid share link',
  DZ863: 'This share link has expired',
  DZ864: 'This share link has been revoked',
  DZ871: 'Unknown SOS event id',
  DZ872: 'Too many SOS triggers in a short period — please wait or call emergency services directly',
  DZ881: 'Your admin role does not grant this permission',
  DZ882: 'Unknown admin role',
  DZ891: 'Unknown registry import run id',
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
    const rows = await this.db.raw<DriverProfileRow>(
      `select id, full_name, nin, phone, email, address, vehicle_id, no_show_count, flagged_at,
              rating_avg, rating_count, trust_badge(rating_avg, rating_count, flagged_at) as trust_badge
         from driver where id = $1`,
      [driverId],
    );
    return rows[0] ?? null;
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
      columns: ['id', 'matricule', 'seats', 'make', 'model', 'notes', 'wheelchair_accessible', 'pets_allowed', 'luggage_capacity'],
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

  /**
   * Task 7.4 — admin manual/override refund. Now routed through
   * apply_refund() (initiated_by='admin') instead of calling refund_payment()
   * directly, so every refund — however it originates — ends up in the one
   * audit ledger. Resolves a pre-existing system-generated 'pending' cash
   * refund if one exists for this payment, otherwise creates+immediately
   * executes a fresh one (admin action = treated as already confirmed/done).
   */
  async refundPayment(paymentId: string, amount: number | string | null | undefined, adminId: string): Promise<string> {
    const id = await this.db.callScalar<string>('apply_refund', paymentId, amount ?? null, 'admin', adminId, null);
    if (!id) throw new Error('apply_refund returned no id');
    return id;
  }

  async failRefund(refundId: string, adminId: string, reason: string): Promise<void> {
    await this.db.callScalar('fail_refund', refundId, adminId, reason);
  }

  async retryRefund(refundId: string, adminId: string): Promise<string> {
    const id = await this.db.callScalar<string>('retry_refund', refundId, adminId);
    if (!id) throw new Error('retry_refund returned no id');
    return id;
  }

  async listReservations(where?: Where, limit?: number): Promise<ReservationViewRow[]> {
    return this.db.select<ReservationViewRow>('v_reservation', { where, orderBy: 'created_at desc', limit });
  }

  /** Bare ownership check (customer_id) without pulling the whole v_reservation join — used by routes that need to authorize before acting (e.g. promo-code redemption, wallet payment). */
  async getReservationOwner(reservationId: string): Promise<{ customer_id: string; status: string; total_price: string } | null> {
    return this.db.selectOne<{ customer_id: string; status: string; total_price: string }>('reservation', {
      columns: ['customer_id', 'status', 'total_price'],
      where: { id: reservationId },
    });
  }

  async getReservation(reservationId: string): Promise<ReservationViewRow | null> {
    return this.db.selectOne<ReservationViewRow>('v_reservation', { where: { id: reservationId } });
  }

  async listPayments(where?: Where, limit?: number): Promise<PaymentViewRow[]> {
    return this.db.select<PaymentViewRow>('v_payment', { where, orderBy: 'created_at desc', limit });
  }

  /** Refund ledger rows still awaiting a human (cash refunds only — see v_refund_due). */
  async refundsDue(): Promise<RefundDueRow[]> {
    return this.db.select<RefundDueRow>('v_refund_due');
  }

  /**
   * Payment-level refund worklist (Task 1.4, reworked for Task 7.4) — one
   * row per refund *ledger entry* of any status, newest first, with the
   * trip/customer context the admin UI needs to act on it (complete/fail/
   * retry). Replaces the old "any cancelled+paid reservation" heuristic,
   * which stopped being correct once partial-refund policies existed.
   */
  async refundWorklist(status?: string): Promise<RefundWorklistRow[]> {
    return this.db.raw<RefundWorklistRow>(
      `select rf.id as refund_id, rf.payment_id, p.code as payment_code,
              rf.reservation_id, r.code as reservation_code,
              cs.full_name as customer_name, cs.phone as customer_phone,
              tr.code as trip_code, tr.departure_at,
              rf.amount, rf.status, rf.policy_pct, rf.initiated_by, rf.gateway,
              rf.failure_reason, rf.created_at, rf.processed_at
         from refund rf
         join payment p      on p.id = rf.payment_id
         join reservation r  on r.id = rf.reservation_id
         join customer cs    on cs.id = r.customer_id
         join trip tr        on tr.id = r.trip_id
        where ($1::text is null or rf.status = $1)
        order by rf.created_at desc`,
      [status ?? null],
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

  // ── Vehicle inspection (Task 6.2) ────────────────────────────────────────────

  async submitVehicleInspection(
    vehicleId: string,
    submittedByDriver: string | null,
    data: {
      inspectionDate: string;
      expiryDate: string;
      maintenanceStatus: VehicleInspectionRow['maintenance_status'];
      notes?: string | null;
    },
    file?: { path: string; fileName: string; mimeType: string } | null,
  ): Promise<string> {
    const row = await this.db.insert<{ id: string }>('vehicle_inspection', {
      vehicle_id: vehicleId,
      submitted_by_driver: submittedByDriver,
      inspection_date: data.inspectionDate,
      expiry_date: data.expiryDate,
      maintenance_status: data.maintenanceStatus,
      notes: data.notes ?? null,
      file_path: file?.path ?? null,
      file_name: file?.fileName ?? null,
      mime_type: file?.mimeType ?? null,
    });
    return row.id;
  }

  private static readonly VEHICLE_INSPECTION_SELECT = `
    select i.id, i.vehicle_id, v.matricule as vehicle_matricule, i.submitted_by_driver,
           i.inspection_date, i.expiry_date, i.maintenance_status,
           i.file_path, i.file_name, i.mime_type, i.notes,
           i.approval_state, i.rejection_reason, i.reviewed_by, au.full_name as reviewed_by_name,
           i.reviewed_at, i.created_at, i.updated_at
      from vehicle_inspection i
      join vehicle v on v.id = i.vehicle_id
      left join app_user au on au.id = i.reviewed_by`;

  async getVehicleInspection(id: string): Promise<VehicleInspectionRow | null> {
    const rows = await this.db.raw<VehicleInspectionRow>(`${DomainRepository.VEHICLE_INSPECTION_SELECT} where i.id = $1`, [id]);
    return rows[0] ?? null;
  }

  async listVehicleInspectionsForVehicle(vehicleId: string): Promise<VehicleInspectionRow[]> {
    return this.db.raw<VehicleInspectionRow>(`${DomainRepository.VEHICLE_INSPECTION_SELECT} where i.vehicle_id = $1 order by i.created_at desc`, [
      vehicleId,
    ]);
  }

  async listVehicleInspectionsAdmin(status?: VehicleInspectionRow['approval_state']): Promise<VehicleInspectionRow[]> {
    const sql = status
      ? `${DomainRepository.VEHICLE_INSPECTION_SELECT} where i.approval_state = $1 order by i.created_at`
      : `${DomainRepository.VEHICLE_INSPECTION_SELECT} order by i.created_at desc`;
    return this.db.raw<VehicleInspectionRow>(sql, status ? [status] : []);
  }

  async approveVehicleInspection(id: string, adminId: string): Promise<void> {
    await this.db.callScalar('vehicle_inspection_approve', id, adminId);
  }

  async rejectVehicleInspection(id: string, adminId: string, reason: string): Promise<void> {
    await this.db.callScalar('vehicle_inspection_reject', id, adminId, reason);
  }

  async isVehicleEligible(vehicleId: string): Promise<boolean> {
    return (await this.db.callScalar<boolean>('vehicle_is_eligible', vehicleId)) ?? false;
  }

  // ── Ratings & reviews (Task 6.3) ─────────────────────────────────────────────

  async submitRating(params: {
    reservationId: string;
    direction: RatingDirection;
    stars: number;
    review?: string | null;
    raterCustomerId?: string | null;
    raterDriverId?: string | null;
  }): Promise<string> {
    const id = await this.db.callScalar<string>(
      'submit_rating',
      params.reservationId,
      params.direction,
      params.stars,
      params.review ?? null,
      params.raterCustomerId ?? null,
      params.raterDriverId ?? null,
    );
    if (!id) throw new Error('submit_rating returned no id');
    return id;
  }

  private static readonly RATING_SELECT = `
    select r.id, r.reservation_id, res.code as reservation_code, r.direction,
           r.rater_customer_id, rc.full_name as rater_customer_name,
           r.rater_driver_id, rd.full_name as rater_driver_name,
           r.ratee_customer_id, tc.full_name as ratee_customer_name,
           r.ratee_driver_id, td.full_name as ratee_driver_name,
           r.stars, r.review, r.hidden_at, r.moderation_reason, r.moderated_by, r.created_at
      from rating r
      join reservation res      on res.id = r.reservation_id
      left join customer rc     on rc.id = r.rater_customer_id
      left join driver   rd     on rd.id = r.rater_driver_id
      left join customer tc     on tc.id = r.ratee_customer_id
      left join driver   td     on td.id = r.ratee_driver_id`;

  async getRating(id: string): Promise<RatingRow | null> {
    const rows = await this.db.raw<RatingRow>(`${DomainRepository.RATING_SELECT} where r.id = $1`, [id]);
    return rows[0] ?? null;
  }

  async listRatingsForDriver(driverId: string, includeHidden = false): Promise<RatingRow[]> {
    const hiddenFilter = includeHidden ? '' : ' and r.hidden_at is null';
    return this.db.raw<RatingRow>(
      `${DomainRepository.RATING_SELECT} where r.ratee_driver_id = $1${hiddenFilter} order by r.created_at desc`,
      [driverId],
    );
  }

  async listRatingsForCustomer(customerId: string, includeHidden = false): Promise<RatingRow[]> {
    const hiddenFilter = includeHidden ? '' : ' and r.hidden_at is null';
    return this.db.raw<RatingRow>(
      `${DomainRepository.RATING_SELECT} where r.ratee_customer_id = $1${hiddenFilter} order by r.created_at desc`,
      [customerId],
    );
  }

  async listRatingsAdmin(): Promise<RatingRow[]> {
    return this.db.raw<RatingRow>(`${DomainRepository.RATING_SELECT} order by r.created_at desc`);
  }

  /** Which direction(s) of a reservation's two-way rating already exist — lets the UI hide an already-used rate button. */
  async getReservationRatingStatus(reservationId: string): Promise<{ customer_to_driver: boolean; driver_to_customer: boolean }> {
    const rows = await this.db.raw<{ direction: RatingDirection }>('select direction from rating where reservation_id = $1', [reservationId]);
    return {
      customer_to_driver: rows.some((r) => r.direction === 'customer_to_driver'),
      driver_to_customer: rows.some((r) => r.direction === 'driver_to_customer'),
    };
  }

  async moderateRating(id: string, adminId: string, hide: boolean, reason?: string | null): Promise<void> {
    await this.db.callScalar('moderate_rating', id, adminId, hide, reason ?? null);
  }

  // ── Fraud / anomaly signals (Task 6.4) ───────────────────────────────────────

  async listFraudSignals(): Promise<FraudSignalRow[]> {
    return this.db.raw<FraudSignalRow>('select * from list_fraud_signals()');
  }

  // ── Payment gateway (mock/sandbox adapter) + webhook (Task 7.1 / 7.2) ────────

  async createGatewayPaymentIntent(params: {
    reservationId: string;
    amount: number | string;
    method: PaymentMethod;
    gateway: string;
    gatewayTransactionId: string;
  }): Promise<string> {
    const id = await this.db.callScalar<string>(
      'create_payment_intent',
      params.reservationId,
      params.amount,
      params.method,
      params.gateway,
      params.gatewayTransactionId,
    );
    if (!id) throw new Error('create_payment_intent returned no id');
    return id;
  }

  /**
   * An existing still-open (pending, not yet expired) gateway intent for
   * this reservation, if any — avoids piling up duplicate checkout sessions
   * on repeated clicks. Task 7.3: a 'pending' row whose expires_at has
   * already passed is stale (expire_stale_payment_intents() just hasn't
   * swept it yet) and must not be reused — treat it as if it weren't open.
   */
  async findOpenGatewayIntent(reservationId: string): Promise<PaymentViewRow | null> {
    const rows = await this.db.raw<PaymentViewRow>(
      `select v.* from v_payment v
        join payment p on p.id = v.id
        where p.reservation_id = $1 and v.status = 'pending' and v.gateway_transaction_id is not null
          and (p.expires_at is null or p.expires_at > now())
        order by v.created_at desc limit 1`,
      [reservationId],
    );
    return rows[0] ?? null;
  }

  /** Task 7.3 — sweep expired pending gateway intents; returns how many were expired. Called on a server-side interval. */
  async expireStalePaymentIntents(): Promise<number> {
    const n = await this.db.callScalar<number>('expire_stale_payment_intents');
    return n ?? 0;
  }

  /** Task 7.4 — preview the cancellation-refund percentage that would apply to a trip right now (read-only; same function cancel_reservation() itself uses). */
  async cancellationRefundPctPreview(tripId: string): Promise<number> {
    // Deliberately does NOT pass a 2nd arg: the SQL function defaults p_at
    // to now() itself — explicitly passing null here would override that
    // default with an actual NULL and make every comparison inside the
    // function (NULL >= x) silently false, always returning 0%.
    const pct = await this.db.callScalar<string>('cancellation_refund_pct', tripId);
    return pct != null ? Number(pct) : 0;
  }

  // ── Driver payout ledger (Task 8.1 / 8.2 / 8.3) ───────────────────────────────

  async driverEarningsSummary(driverId: string): Promise<DriverEarningsSummary> {
    const rows = await this.db.raw<DriverEarningsSummary>('select * from driver_earnings_summary($1)', [driverId]);
    return (
      rows[0] ?? { gross_revenue: '0', commission: '0', refunds: '0', net_earnings: '0', pending_payout: '0', paid_out: '0' }
    );
  }

  async listPayoutLedger(driverId: string, limit = 200): Promise<PayoutLedgerRow[]> {
    return this.db.raw<PayoutLedgerRow>(
      `select pl.*, r.code as reservation_code, tr.code as trip_code
         from payout_ledger pl
         left join reservation r on r.id = pl.reservation_id
         left join trip tr       on tr.id = pl.trip_id
        where pl.driver_id = $1
        order by pl.created_at desc
        limit $2`,
      [driverId, limit],
    );
  }

  async listPayoutBatches(driverId?: string): Promise<PayoutBatchRow[]> {
    return this.db.raw<PayoutBatchRow>(
      `select pb.*, d.full_name as driver_name
         from payout_batch pb
         join driver d on d.id = pb.driver_id
        where $1::uuid is null or pb.driver_id = $1
        order by pb.created_at desc`,
      [driverId ?? null],
    );
  }

  async createPayoutBatch(driverId: string, periodStart: string, periodEnd: string): Promise<string> {
    const id = await this.db.callScalar<string>('create_payout_batch', driverId, periodStart, periodEnd);
    if (!id) throw new Error('create_payout_batch returned no id');
    return id;
  }

  async markPayoutBatchPaid(batchId: string, reference: string): Promise<void> {
    await this.db.callScalar('mark_payout_batch_paid', batchId, reference);
  }

  // ── Wallet (Task 9.3) ──────────────────────────────────────────────────────

  async walletBalance(customerId: string): Promise<string> {
    const v = await this.db.callScalar<string>('wallet_balance', customerId);
    return v ?? '0';
  }

  async walletHistory(customerId: string, limit = 100): Promise<WalletEntryRow[]> {
    return this.db.select<WalletEntryRow>('wallet_entry', { where: { customer_id: customerId }, orderBy: 'created_at desc', limit });
  }

  /** Admin-only manual adjustment — positive amount credits, negative amount debits (atomically, via wallet_debit so an overdraft is still impossible). */
  async adjustWallet(customerId: string, amount: number, description: string): Promise<string> {
    if (amount === 0) throw new Error('amount must be non-zero');
    const id =
      amount > 0
        ? await this.db.callScalar<string>('wallet_credit', customerId, 'admin_adjustment', amount, null, null, description)
        : await this.db.callScalar<string>('wallet_debit', customerId, Math.abs(amount), 'admin_adjustment', null, null, description);
    if (!id) throw new Error('wallet adjustment returned no id');
    return id;
  }

  /** Task 9.3 — pay a reservation (fully or the given amount) straight from the customer's wallet. Returns the new payment id. */
  async payReservationWithWallet(reservationId: string, amount?: number | null): Promise<string> {
    const id = await this.db.callScalar<string>('pay_reservation_with_wallet', reservationId, amount ?? null);
    if (!id) throw new Error('pay_reservation_with_wallet returned no id');
    return id;
  }

  // ── Promo codes (Task 9.2) ────────────────────────────────────────────────

  async listPromoCodes(): Promise<PromoCodeRow[]> {
    return this.db.select<PromoCodeRow>('promo_code', { orderBy: 'created_at desc' });
  }

  async createPromoCode(p: {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minAmount?: number;
    maxUsesTotal?: number | null;
    maxUsesPerCustomer?: number;
    startsAt?: string | null;
    expiresAt?: string | null;
    createdBy: string;
  }): Promise<string> {
    const row = await this.db.insert<{ id: string }>('promo_code', {
      code: p.code.toUpperCase().trim(),
      discount_type: p.discountType,
      discount_value: p.discountValue,
      min_amount: p.minAmount ?? 0,
      max_uses_total: p.maxUsesTotal ?? null,
      max_uses_per_customer: p.maxUsesPerCustomer ?? 1,
      starts_at: p.startsAt ?? null,
      expires_at: p.expiresAt ?? null,
      created_by: p.createdBy,
    });
    return row.id;
  }

  async setPromoCodeActive(id: string, active: boolean): Promise<void> {
    await this.db.update('promo_code', { active }, { id });
  }

  /** Task 9.2 — validates + redeems a promo code for a customer, crediting the discount to their wallet. basis_amount is the reservation's total_price. */
  async redeemPromoCode(customerId: string, code: string, basisAmount: number, reservationId?: string | null): Promise<string> {
    const id = await this.db.callScalar<string>('redeem_promo_code', customerId, code, basisAmount, reservationId ?? null);
    if (!id) throw new Error('redeem_promo_code returned no id');
    return id;
  }

  // ── Referral program (Task 9.4) ───────────────────────────────────────────

  async getReferralSummary(customerId: string): Promise<ReferralSummary> {
    const rows = await this.db.raw<{ referral_code: string; referred_by_customer_id: string | null }>(
      'select referral_code, referred_by_customer_id from customer where id = $1',
      [customerId],
    );
    if (!rows[0]) throw new Error('Customer not found');
    const agg = await this.db.raw<{ total_referred: string; total_rewarded: string }>(
      `select count(*)::int as total_referred, coalesce(sum(reward_amount), 0) as total_rewarded
         from referral_reward where referrer_id = $1`,
      [customerId],
    );
    return {
      referral_code: rows[0].referral_code,
      referred_by_customer_id: rows[0].referred_by_customer_id,
      total_referred: Number(agg[0]?.total_referred ?? 0),
      total_rewarded: agg[0]?.total_rewarded ?? '0',
    };
  }

  async listReferralRewards(customerId: string): Promise<ReferralRewardRow[]> {
    return this.db.raw<ReferralRewardRow>(
      `select rr.*, cs.full_name as referred_name
         from referral_reward rr
         join customer cs on cs.id = rr.referred_id
        where rr.referrer_id = $1
        order by rr.created_at desc`,
      [customerId],
    );
  }

  /** Task 9.4 — attach a new customer to a referrer by code (called once, right after signup, if they entered one). */
  async attributeReferral(newCustomerId: string, code: string): Promise<void> {
    await this.db.callScalar('attribute_referral', newCustomerId, code);
  }

  // ── Dynamic pricing suggestions (Task 9.1) ────────────────────────────────

  /** Read-only suggestion — never writes; admin must explicitly apply it via sp_set_trip_price(). */
  async suggestTripPrice(tripId: string, fromWpointId: string, toWpointId: string): Promise<string> {
    const price = await this.db.callScalar<string>('suggest_trip_price', tripId, fromWpointId, toWpointId);
    if (price == null) throw new Error('suggest_trip_price returned no value');
    return price;
  }

  // ── PDF receipts (Task 9.5) ──────────────────────────────────────────────────

  /** Everything a receipt needs, in one round trip: reservation/trip/customer header + every payment + every refund against it. Generated on the fly — nothing is persisted as a file. */
  async getReceiptData(reservationId: string): Promise<ReceiptData | null> {
    const headerRows = await this.db.raw<ReceiptHeader>(
      `select r.id, r.code, r.seats, r.total_price, r.currency, r.created_at,
              r.customer_id, cs.full_name as customer_name, cs.phone as customer_phone,
              t.code as trip_code, t.departure_at, tj.name as trajectory_name
         from reservation r
         join customer cs    on cs.id = r.customer_id
         join trip t          on t.id = r.trip_id
         join trajectory tj   on tj.id = t.trajectory_id
        where r.id = $1`,
      [reservationId],
    );
    const header = headerRows[0];
    if (!header) return null;

    const payments = await this.db.raw<ReceiptPaymentLine>(
      `select id, code, amount, refunded_amount, currency, method, status, paid_at, created_at
         from payment where reservation_id = $1 order by created_at`,
      [reservationId],
    );
    const refunds = await this.db.raw<ReceiptRefundLine>(
      `select rf.id, rf.payment_id, p.code as payment_code, rf.amount, rf.status, rf.initiated_by, rf.created_at, rf.processed_at
         from refund rf join payment p on p.id = rf.payment_id
        where rf.reservation_id = $1 order by rf.created_at`,
      [reservationId],
    );

    return { header, payments, refunds };
  }

  async getPaymentByGatewayTransactionId(transactionId: string): Promise<PaymentViewRow | null> {
    const rows = await this.db.raw<PaymentViewRow>('select * from v_payment where gateway_transaction_id = $1', [transactionId]);
    return rows[0] ?? null;
  }

  /**
   * The only entry point allowed to resolve a gateway payment intent —
   * wraps gateway_apply_payment_event(), which is itself the single place
   * payment.status is ever flipped to paid/failed from a webhook. Never
   * call settle_payment()/update payment directly for a gateway-tagged row.
   */
  async applyGatewayPaymentEvent(params: {
    paymentId: string;
    gateway: string;
    gatewayEventId: string;
    eventType: 'payment.succeeded' | 'payment.failed';
    signatureValid: boolean;
    rawPayload: Record<string, unknown>;
  }): Promise<'processed' | 'duplicate' | 'rejected'> {
    const result = await this.db.callScalar<'processed' | 'duplicate' | 'rejected'>(
      'gateway_apply_payment_event',
      params.paymentId,
      params.gateway,
      params.gatewayEventId,
      params.eventType,
      params.signatureValid,
      JSON.stringify(params.rawPayload),
    );
    return result ?? 'rejected';
  }

  async listPaymentGatewayEvents(paymentId?: string): Promise<PaymentGatewayEventRow[]> {
    return paymentId
      ? this.db.raw<PaymentGatewayEventRow>('select * from payment_gateway_event where payment_id = $1 order by received_at desc', [paymentId])
      : this.db.raw<PaymentGatewayEventRow>('select * from payment_gateway_event order by received_at desc limit 200');
  }

  // ── Waitlist (Task 10.2) ───────────────────────────────────────────────────

  async joinWaitlist(tripId: string, customerId: string, seats: number, pickupWpointId?: string | null, dropoffWpointId?: string | null): Promise<string> {
    const id = await this.db.callScalar<string>('join_waitlist', tripId, customerId, seats, pickupWpointId ?? null, dropoffWpointId ?? null);
    if (!id) throw new Error('join_waitlist returned no id');
    return id;
  }

  async cancelWaitlistEntry(entryId: string, customerId: string): Promise<void> {
    await this.db.callScalar('cancel_waitlist_entry', entryId, customerId);
  }

  async listMyWaitlistEntries(customerId: string): Promise<(WaitlistEntryRow & { trip_code: string; departure_at: string; position_now: number | null })[]> {
    return this.db.raw(
      `select w.*, t.code as trip_code, t.departure_at,
              case when w.status = 'waiting' then waitlist_position(w.id) else null end as position_now
         from waitlist_entry w join trip t on t.id = w.trip_id
        where w.customer_id = $1
        order by w.created_at desc`,
      [customerId],
    );
  }

  async listTripWaitlist(tripId: string): Promise<(WaitlistEntryRow & { customer_name: string })[]> {
    return this.db.raw(
      `select w.*, c.full_name as customer_name from waitlist_entry w join customer c on c.id = w.customer_id
        where w.trip_id = $1 order by w.position asc`,
      [tripId],
    );
  }

  async promoteWaitlist(tripId: string): Promise<number> {
    return (await this.db.callScalar<number>('promote_waitlist', tripId)) ?? 0;
  }

  // ── Recurring trip templates (Task 10.3) ──────────────────────────────────

  async createRecurringTemplate(p: {
    trajectoryId: string; driverId?: string | null; vehicleId?: string | null; weekdays: number[];
    departureTime: string; capacity: number; seatPrice: number; startsOn: string; endsOn?: string | null;
    horizonDays?: number; notes?: string | null;
  }): Promise<string> {
    // `weekdays` is a native `smallint[]` column. The management-API transport
    // (see DB/sql-utils.ts sqlLiteral) always inlines a JS array as a jsonb
    // literal, which Postgres cannot implicitly cast to smallint[] — so this
    // formats it as a Postgres array-literal string ('{2,4}') and casts it
    // explicitly in the SQL text instead of relying on the generic encoding.
    const weekdaysLiteral = `{${p.weekdays.join(',')}}`;
    const rows = await this.db.raw<{ id: string }>(
      `insert into recurring_trip_template
         (trajectory_id, driver_id, vehicle_id, weekdays, departure_time, capacity, seat_price, starts_on, ends_on, horizon_days, notes)
       values ($1,$2,$3,$4::smallint[],$5,$6,$7,$8,$9,$10,$11) returning id`,
      [p.trajectoryId, p.driverId ?? null, p.vehicleId ?? null, weekdaysLiteral, p.departureTime, p.capacity, p.seatPrice, p.startsOn, p.endsOn ?? null, p.horizonDays ?? 14, p.notes ?? null],
    );
    const id = rows[0]?.id;
    if (!id) throw new Error('recurring_trip_template insert returned no id');
    await this.db.callScalar('generate_recurring_trips', id);
    return id;
  }

  async listRecurringTemplates(): Promise<(RecurringTemplateRow & { trajectory_name: string; driver_name: string | null })[]> {
    return this.db.raw(
      `select rt.*, tj.name as trajectory_name, d.full_name as driver_name
         from recurring_trip_template rt
         join trajectory tj on tj.id = rt.trajectory_id
         left join driver d on d.id = rt.driver_id
        order by rt.created_at desc`,
    );
  }

  async generateRecurringTrips(templateId: string): Promise<number> {
    return (await this.db.callScalar<number>('generate_recurring_trips', templateId)) ?? 0;
  }

  async cancelRecurringTemplate(templateId: string): Promise<number> {
    return (await this.db.callScalar<number>('cancel_recurring_template', templateId)) ?? 0;
  }

  async addRecurringException(templateId: string, date: string, notes?: string | null): Promise<void> {
    await this.db.callScalar('add_recurring_exception', templateId, date, notes ?? null);
  }

  async listRecurringExceptions(templateId: string): Promise<RecurringExceptionRow[]> {
    return this.db.raw('select * from recurring_trip_exception where template_id = $1 order by exception_date', [templateId]);
  }

  async listRecurringTrips(templateId: string): Promise<QueryRow[]> {
    return this.db.raw('select * from v_trip where id in (select id from trip where recurring_template_id = $1) order by departure_at', [templateId]);
  }

  // ── Favorites (Task 10.5) ──────────────────────────────────────────────────

  async addFavoriteRoute(customerId: string, originWpointId: string, destinationWpointId: string, notify = true): Promise<string> {
    const id = await this.db.callScalar<string>('add_favorite_route', customerId, originWpointId, destinationWpointId, notify);
    if (!id) throw new Error('add_favorite_route returned no id');
    return id;
  }
  async removeFavoriteRoute(id: string, customerId: string): Promise<void> {
    await this.db.callScalar('remove_favorite_route', id, customerId);
  }
  async addFavoriteDriver(customerId: string, driverId: string, notify = true): Promise<string> {
    const id = await this.db.callScalar<string>('add_favorite_driver', customerId, driverId, notify);
    if (!id) throw new Error('add_favorite_driver returned no id');
    return id;
  }
  async removeFavoriteDriver(id: string, customerId: string): Promise<void> {
    await this.db.callScalar('remove_favorite_driver', id, customerId);
  }
  async listFavoriteRoutes(customerId: string): Promise<(FavoriteRouteRow & { origin_wilaya: string; destination_wilaya: string })[]> {
    return this.db.raw(
      `select fr.*, wo.nom_fr as origin_wilaya, wd.nom_fr as destination_wilaya
         from favorite_route fr
         join wpoint po on po.id = fr.origin_wpoint_id join wilaya wo on wo.id = po.wilaya_id
         join wpoint pd on pd.id = fr.destination_wpoint_id join wilaya wd on wd.id = pd.wilaya_id
        where fr.customer_id = $1 order by fr.created_at desc`,
      [customerId],
    );
  }
  async listFavoriteDrivers(customerId: string): Promise<(FavoriteDriverRow & { driver_name: string })[]> {
    return this.db.raw(
      `select fd.*, d.full_name as driver_name from favorite_driver fd join driver d on d.id = fd.driver_id
        where fd.customer_id = $1 order by fd.created_at desc`,
      [customerId],
    );
  }

  // ── Group bookings (Task 10.6) ────────────────────────────────────────────

  async setReservationPassengers(reservationId: string, passengers: ReservationPassengerInput[]): Promise<void> {
    await this.db.callScalar('set_reservation_passengers', reservationId, JSON.stringify(passengers));
  }
  async listReservationPassengers(reservationId: string): Promise<ReservationPassengerRow[]> {
    return this.db.raw('select * from reservation_passenger where reservation_id = $1 order by created_at', [reservationId]);
  }

  // ── Accessibility / service requirements (Task 10.7) ──────────────────────

  async setReservationRequirements(reservationId: string, p: { needsWheelchair?: boolean; hasPet?: boolean; luggageCount?: number; specialRequirements?: string | null }): Promise<void> {
    await this.db.callScalar(
      'set_reservation_requirements', reservationId,
      p.needsWheelchair ?? false, p.hasPet ?? false, p.luggageCount ?? 0, p.specialRequirements ?? null,
    );
  }
  async setVehicleAccessibility(vehicleId: string, p: { wheelchairAccessible?: boolean; petsAllowed?: boolean; luggageCapacity?: number | null }): Promise<void> {
    await this.db.raw(
      'update vehicle set wheelchair_accessible = coalesce($2, wheelchair_accessible), pets_allowed = coalesce($3, pets_allowed), luggage_capacity = coalesce($4, luggage_capacity) where id = $1',
      [vehicleId, p.wheelchairAccessible ?? null, p.petsAllowed ?? null, p.luggageCapacity ?? null],
    );
  }

  // ── Notifications (Task 11.1) ─────────────────────────────────────────────

  async listNotifications(userId: string, unreadOnly = false, limit = 100): Promise<NotificationRow[]> {
    return unreadOnly
      ? this.db.raw('select * from notification where recipient_user_id = $1 and read_at is null order by created_at desc limit $2', [userId, limit])
      : this.db.raw('select * from notification where recipient_user_id = $1 order by created_at desc limit $2', [userId, limit]);
  }
  async countUnreadNotifications(userId: string): Promise<number> {
    const rows = await this.db.raw<{ n: string }>('select count(*) as n from notification where recipient_user_id = $1 and read_at is null', [userId]);
    return Number(rows[0]?.n ?? 0);
  }
  async markNotificationRead(id: string, userId: string): Promise<void> {
    await this.db.callScalar('mark_notification_read', id, userId);
  }
  async markAllNotificationsRead(userId: string): Promise<number> {
    return (await this.db.callScalar<number>('mark_all_notifications_read', userId)) ?? 0;
  }

  // ── In-app messaging (Task 11.2) ──────────────────────────────────────────

  async getOrCreateConversation(reservationId: string): Promise<string> {
    const id = await this.db.callScalar<string>('get_or_create_conversation', reservationId);
    if (!id) throw new Error('get_or_create_conversation returned no id');
    return id;
  }
  async sendMessage(conversationId: string, senderRole: 'customer' | 'driver', senderId: string, body: string): Promise<string> {
    const id = await this.db.callScalar<string>('send_message', conversationId, senderRole, senderId, body);
    if (!id) throw new Error('send_message returned no id');
    return id;
  }
  async listMessages(conversationId: string): Promise<MessageRow[]> {
    return this.db.raw('select * from message where conversation_id = $1 order by created_at asc', [conversationId]);
  }
  async markConversationRead(conversationId: string, readerRole: 'customer' | 'driver'): Promise<number> {
    return (await this.db.callScalar<number>('mark_conversation_read', conversationId, readerRole)) ?? 0;
  }
  /** Reservation ids this driver/customer is a participant in, so the API can authorize access to a conversation. */
  async getConversationParticipants(conversationId: string): Promise<{ reservation_id: string; customer_id: string; driver_id: string | null } | null> {
    const rows = await this.db.raw<{ reservation_id: string; customer_id: string; driver_id: string | null }>(
      `select c.reservation_id, r.customer_id, t.driver_id
         from conversation c join reservation r on r.id = c.reservation_id join trip t on t.id = r.trip_id
        where c.id = $1`,
      [conversationId],
    );
    return rows[0] ?? null;
  }

  // ── Masked calling / contact reveal (Task 11.3 — honest scope, see sql.txt) ─

  async revealContact(reservationId: string, requesterRole: 'customer' | 'driver', requesterId: string): Promise<string> {
    const phone = await this.db.callScalar<string>('reveal_contact', reservationId, requesterRole, requesterId);
    if (!phone) throw new Error('reveal_contact returned no phone');
    return phone;
  }
  async listContactReveals(reservationId: string): Promise<QueryRow[]> {
    return this.db.raw('select * from contact_reveal_log where reservation_id = $1 order by created_at desc', [reservationId]);
  }

  // ── Shareable live-trip link (Task 11.4) ──────────────────────────────────

  async createShareToken(reservationId: string, tokenHash: string, ttlHours = 24): Promise<string> {
    const id = await this.db.callScalar<string>('create_share_token', reservationId, tokenHash, ttlHours);
    if (!id) throw new Error('create_share_token returned no id');
    return id;
  }
  async revokeShareToken(tokenId: string, reservationId: string): Promise<void> {
    await this.db.callScalar('revoke_share_token', tokenId, reservationId);
  }
  async listShareTokens(reservationId: string): Promise<QueryRow[]> {
    return this.db.raw('select id, expires_at, revoked_at, created_at from trip_share_token where reservation_id = $1 order by created_at desc', [reservationId]);
  }
  async getSharedTripInfo(tokenHash: string): Promise<Record<string, unknown>> {
    const result = await this.db.callScalar<Record<string, unknown>>('get_shared_trip_info', tokenHash);
    if (!result) throw new Error('get_shared_trip_info returned no data');
    return result;
  }

  // ── SOS (Task 11.5) ────────────────────────────────────────────────────────

  async addEmergencyContact(customerId: string, fullName: string, phone: string, relationship?: string | null): Promise<string> {
    const rows = await this.db.raw<{ id: string }>(
      'insert into emergency_contact (customer_id, full_name, phone, relationship) values ($1,$2,$3,$4) returning id',
      [customerId, fullName, phone, relationship ?? null],
    );
    return rows[0].id;
  }
  async listEmergencyContacts(customerId: string): Promise<EmergencyContactRow[]> {
    return this.db.raw('select * from emergency_contact where customer_id = $1 order by created_at', [customerId]);
  }
  async removeEmergencyContact(id: string, customerId: string): Promise<number> {
    const rows = await this.db.raw('delete from emergency_contact where id = $1 and customer_id = $2 returning id', [id, customerId]);
    return rows.length;
  }
  async triggerSos(p: { reservationId?: string | null; role: 'customer' | 'driver'; id: string; lat?: number | null; lon?: number | null; notes?: string | null }): Promise<string> {
    const id = await this.db.callScalar<string>('trigger_sos', p.reservationId ?? null, p.role, p.id, p.lat ?? null, p.lon ?? null, p.notes ?? null);
    if (!id) throw new Error('trigger_sos returned no id');
    return id;
  }
  async listSosEvents(status?: SosStatus): Promise<(SosEventRow & { reservation_code: string | null; trip_code: string | null })[]> {
    return status
      ? this.db.raw('select s.*, r.code as reservation_code, t.code as trip_code from sos_event s left join reservation r on r.id = s.reservation_id left join trip t on t.id = s.trip_id where s.status = $1 order by s.created_at desc', [status])
      : this.db.raw('select s.*, r.code as reservation_code, t.code as trip_code from sos_event s left join reservation r on r.id = s.reservation_id left join trip t on t.id = s.trip_id order by s.created_at desc');
  }
  async resolveSosEvent(eventId: string, adminId: string, notes?: string | null): Promise<void> {
    await this.db.callScalar('resolve_sos_event', eventId, adminId, notes ?? null);
  }

  // ── Admin audit log (Task 12.4) ───────────────────────────────────────────

  async logAdminAction(p: { adminId: string | null; action: string; targetType: string; targetId: string | null; before?: unknown; after?: unknown; reason?: string | null }): Promise<string> {
    const id = await this.db.callScalar<string>(
      'log_admin_action', p.adminId, p.action, p.targetType, p.targetId,
      p.before !== undefined ? JSON.stringify(p.before) : null,
      p.after !== undefined ? JSON.stringify(p.after) : null,
      p.reason ?? null,
    );
    if (!id) throw new Error('log_admin_action returned no id');
    return id;
  }
  async listAdminAuditLog(limit = 200): Promise<(AdminAuditLogRow & { admin_name: string | null })[]> {
    return this.db.raw(
      `select l.*, u.full_name as admin_name from admin_audit_log l left join app_user u on u.id = l.admin_user_id
        order by l.created_at desc limit $1`,
      [limit],
    );
  }

  // ── Admin reschedule override (Task 11.1 "schedule change") ───────────────

  async adminRescheduleTrip(tripId: string, newDepartureAt: string, newArrivalEta: string | null, reason: string, adminId: string): Promise<void> {
    await this.db.callScalar('admin_reschedule_trip', tripId, newDepartureAt, newArrivalEta, reason, adminId);
  }

  // ── Granular admin roles (Task 12.6) ──────────────────────────────────────

  async listAdmins(): Promise<{ id: string; email: string; full_name: string; admin_role: string | null }[]> {
    return this.db.raw(`select id, email, full_name, admin_role from app_user where role = 'admin' order by full_name`);
  }
  async setAdminRole(userId: string, adminRole: string): Promise<void> {
    await this.db.raw(`update app_user set admin_role = $2 where id = $1 and role = 'admin'`, [userId, adminRole]);
  }

  // ── Analytics (Task 12.1 / 12.2) ──────────────────────────────────────────

  async analyticsSummary(from?: string, to?: string): Promise<AnalyticsSummary> {
    const result = await this.db.callScalar<AnalyticsSummary>('admin_analytics_summary', from ?? null, to ?? null);
    return result ?? { revenue: '0', refunds_total: '0', bookings: 0, cancellations: 0, no_shows: 0, occupancy_pct: '0' };
  }
  async analyticsTopWilayaPairs(limit = 10): Promise<QueryRow[]> {
    return this.db.raw('select * from admin_top_wilaya_pairs($1)', [limit]);
  }
  async analyticsTopWpointPairs(limit = 10): Promise<QueryRow[]> {
    return this.db.raw('select * from admin_top_wpoint_pairs($1)', [limit]);
  }
  async analyticsTrajectoryDemand(limit = 10): Promise<QueryRow[]> {
    return this.db.raw('select * from admin_trajectory_demand($1)', [limit]);
  }
  async analyticsDriverPerformance(limit = 50): Promise<QueryRow[]> {
    return this.db.raw('select * from admin_driver_performance($1)', [limit]);
  }
  async analyticsDemandPickupCommunes(limit = 10): Promise<QueryRow[]> {
    return this.db.raw('select * from admin_demand_pickup_communes($1)', [limit]);
  }
  async analyticsDemandDropoffCommunes(limit = 10): Promise<QueryRow[]> {
    return this.db.raw('select * from admin_demand_dropoff_communes($1)', [limit]);
  }
  async analyticsFailedSearches(limit = 20): Promise<QueryRow[]> {
    return this.db.raw('select * from admin_failed_searches($1)', [limit]);
  }
  async logSearch(p: { fromWilayaId: number; toWilayaId: number; fromCommuneId?: number | null; toCommuneId?: number | null; dateFrom?: string | null; dateTo?: string | null; resultsCount: number }): Promise<void> {
    await this.db.callScalar('log_search', p.fromWilayaId, p.toWilayaId, p.fromCommuneId ?? null, p.toCommuneId ?? null, p.dateFrom ?? null, p.dateTo ?? null, p.resultsCount);
  }

  // ── Import history (Task 12.5 — exposes the existing import_log table) ────

  async listImportHistory(limit = 50): Promise<QueryRow[]> {
    return this.db.raw('select * from import_log order by ran_at desc limit $1', [limit]);
  }

  // ── Trip lifecycle scheduler (Task 13.1) ──────────────────────────────────

  async runTripLifecycleTick(): Promise<Record<string, number>> {
    const result = await this.db.callScalar<Record<string, number>>('run_trip_lifecycle_tick');
    return result ?? { started: 0, driver_no_show: 0, cancelled_no_driver: 0, auto_closed: 0, reminded: 0 };
  }
}

function iso(d: string | Date | null | undefined): string | null {
  if (d === null || d === undefined || d === '') return null;
  return d instanceof Date ? d.toISOString() : d;
}
