export interface Wilaya {
  id: number;
  code: string;
  nom_fr: string;
  nom_ar: string;
  /** Approximate chief-town coordinates (static reference data), for map display. */
  lat: number | null;
  lon: number | null;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'customer' | 'admin' | 'driver';
  email_verified: boolean;
  customer_id: string | null;
  driver_id: string | null;
  admin_role: 'super_admin' | 'admin' | 'support' | 'finance' | 'operations' | null;
}

export interface TripSearchRow {
  id: string;
  code: string;
  departure_at: string;
  arrival_eta: string | null;
  capacity: number;
  trajectory_id: string;
  trajectory_name: string;
  pickup_wpoint_id: string;
  from_wilaya: string;
  from_wilaya_ar: string;
  dropoff_wpoint_id: string;
  to_wilaya: string;
  to_wilaya_ar: string;
  price: string;
  currency: string;
  seats_available: number | null;
}

export interface Stop {
  id: string;
  position: number;
  nom_fr: string;
  nom_ar: string;
  wilaya_id: number;
  eta: string | null;
}

export interface PricePair {
  from_wpoint_id: string;
  to_wpoint_id: string;
  price: string;
  currency: string;
}

export interface TripDetail {
  trip: {
    id: string;
    code: string;
    status: string;
    published_at: string | null;
    departure_at: string;
    arrival_eta: string | null;
    capacity: number;
    seat_price: string;
    currency: string;
    driver_name: string | null;
    vehicle_matricule: string | null;
    trajectory_name: string;
    seats_available: number | null;
    nb_active_reservations: number | string;
  };
  stops: Stop[];
  prices: PricePair[];
}

export interface ReservationRow {
  id: string;
  code: string;
  status: string;
  seats: number;
  total_price: string;
  currency: string;
  notes: string | null;
  created_at: string;
  trip_id: string;
  trip_code: string;
  trip_status: string;
  departure_at: string;
  trajectory_name: string;
  amount_paid: string;
  balance_due: string;
  refunded_amount: string;
  payment_status: 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
  refund_status: 'none' | 'partial' | 'full';
  pickup_commune_id?: number | null;
  pickup_commune_name?: string | null;
  dropoff_commune_id?: number | null;
  dropoff_commune_name?: string | null;
}

export interface CustomerProfileRow {
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
}

export interface DriverRow {
  id: string;
  full_name: string;
  nin: string;
  phone: string;
  email: string | null;
  no_show_count?: number;
  flagged_at?: string | null;
  rating_avg?: string | null;
  rating_count?: number;
  trust_badge?: boolean;
}

export interface VehicleRow {
  id: string;
  matricule: string;
  seats: number;
  make: string | null;
  model: string | null;
  is_eligible?: boolean;
  wheelchair_accessible?: boolean;
  pets_allowed?: boolean;
  luggage_capacity?: number | null;
}

export interface TrajectoryRow {
  id: string;
  name: string;
  nb_wpoints: number;
  created_at: string;
}

export interface WpointRow {
  id: string;
  position: number;
  wilaya_id: number;
  nom_fr: string;
  nom_ar: string;
}

export interface DairaRow {
  id: number;
  nom_fr: string;
  nom_ar: string;
}

export interface CommuneRow {
  id: number;
  daira_id: number;
  nom_fr: string;
  nom_ar: string;
  code_postal: string | null;
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
  no_show_count?: number;
  flagged_at?: string | null;
  rating_avg?: string | null;
  rating_count?: number;
}

export interface AdminReservationRow {
  id: string;
  code: string;
  status: string;
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

export interface PaymentRow {
  id: string;
  code: string;
  amount: string;
  refunded_amount: string;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
  reservation_code: string;
  reservation_status: string;
  customer_name: string;
  trip_code: string;
  gateway: string | null;
  gateway_transaction_id: string | null;
  failure_reason: string | null;
}

export interface RefundDueRow {
  reservation_id: string;
  reservation_code: string;
  customer_name: string;
  customer_phone: string;
  refund_due: string;
}

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
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  policy_pct: string | null;
  initiated_by: 'system' | 'admin';
  gateway: string | null;
  failure_reason: string | null;
  created_at: string;
  processed_at: string | null;
}

// ── Driver payouts (Task 8.1 / 8.2 / 8.3) ──────────────────────────────────────

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

// ── Wallet (Task 9.3) ───────────────────────────────────────────────────────────

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

// ── Promo codes (Task 9.2) ───────────────────────────────────────────────────────

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

// ── Referral program (Task 9.4) ──────────────────────────────────────────────────

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

export interface TrackingRow {
  driver_id: string | null;
  driver_name: string | null;
  vehicle_id: string | null;
  vehicle_matricule: string | null;
  gps_lat: string | null;
  gps_lon: string | null;
  recorded_at: string | null;
  kind: 'driver' | 'vehicle';
}

export interface WilayaOverviewRow {
  id: number;
  code: string;
  nom_fr: string;
  nom_ar: string;
  nb_dairas: number;
  nb_communes: number;
  nb_codes_postaux: number;
}

export interface DriverTripRow {
  id: string;
  code: string;
  status: string;
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
  status: string;
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

export interface TripManifestRow {
  id: string;
  code: string;
  status: string;
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

export interface StopManifestPassenger {
  reservation_id: string;
  code: string;
  customer_name: string;
  seats: number;
}

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
  position_age_seconds: number | null;
  stops: StopEtaEntry[];
}

export interface ReservationEtaResult {
  position_age_seconds: number | null;
  stop: StopEtaEntry | null;
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

export type KycDocType = 'identity' | 'license' | 'vehicle_registration' | 'insurance';

export interface KycDocumentRow {
  id: string;
  driver_id: string;
  driver_name: string;
  doc_type: KycDocType;
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

export interface DomainErrorRow {
  sqlstate: string;
  code_name: string;
  ts_equivalent: string;
  description: string;
}

// ── Task 6.2 — vehicle inspection ────────────────────────────────────────────

export type MaintenanceStatus = 'ok' | 'needs_service' | 'out_of_service';

export interface VehicleInspectionRow {
  id: string;
  vehicle_id: string;
  vehicle_matricule: string;
  submitted_by_driver: string | null;
  inspection_date: string;
  expiry_date: string;
  maintenance_status: MaintenanceStatus;
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

// ── Task 6.3 — ratings & reviews ─────────────────────────────────────────────

export type RatingDirection = 'customer_to_driver' | 'driver_to_customer';

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

export interface RatingStatus {
  customer_to_driver: boolean;
  driver_to_customer: boolean;
}

// ── Task 6.4 — fraud / anomaly signals ───────────────────────────────────────

export interface FraudSignalRow {
  signal_type: 'duplicate_nin' | 'duplicate_phone' | 'rapid_cancel_rebook' | 'repeated_no_show' | 'suspicious_payment' | 'account_burst';
  severity: 'low' | 'medium' | 'high';
  subject_type: 'customer' | 'driver';
  subject_id: string | null;
  subject_label: string;
  detail: string;
  detected_at: string;
}

// ── Task 7.1/7.2 — payment gateway ───────────────────────────────────────────

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

// ── 20-task override: Tasks 10.1–13.2 ────────────────────────────────────────

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  data: Record<string, unknown> | null;
}

export interface WaitlistEntryRow {
  id: string;
  trip_id: string;
  customer_id: string;
  customer_name?: string;
  seats: number;
  status: 'waiting' | 'offered' | 'confirmed' | 'expired' | 'cancelled';
  position: number;
  created_at: string;
  trip_code?: string;
  departure_at?: string;
}

export interface FavoriteRouteRow {
  id: string;
  origin_wpoint_id: string;
  destination_wpoint_id: string;
  origin_label: string;
  destination_label: string;
  notify: boolean;
  created_at: string;
}

export interface FavoriteDriverRow {
  id: string;
  driver_id: string;
  driver_name: string;
  notify: boolean;
  created_at: string;
}

export interface ReservationPassengerRow {
  id: string;
  full_name: string;
  phone: string | null;
  fare_share: string | null;
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
  full_name: string;
  phone: string;
  relationship: string | null;
  created_at: string;
}

export interface SosEventRow {
  id: string;
  reservation_id: string | null;
  role: 'customer' | 'driver';
  lat: number | null;
  lon: number | null;
  notes: string | null;
  status: 'open' | 'acknowledged' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

export interface AdminAuditLogRow {
  id: string;
  admin_id: string;
  admin_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
  created_at: string;
}

export interface RecurringTemplateRow {
  id: string;
  trajectory_id: string;
  trajectory_name: string;
  driver_id: string | null;
  driver_name: string | null;
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

export interface AnalyticsSummary {
  revenue: number;
  bookings: number;
  no_shows: number;
  cancellations: number;
  occupancy_pct: number;
  refunds_total: number;
}

export interface ImportLogRow {
  id: string;
  ran_at: string;
  success: boolean;
  error_details: string | null;
  [k: string]: unknown;
}

export interface AdminUserRow {
  id: string;
  full_name: string;
  email: string;
  admin_role: 'super_admin' | 'admin' | 'support' | 'finance' | 'operations' | null;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
}

export interface SharedTripInfo {
  reservation_status: string;
  trip_status: string;
  departure_at: string;
  arrival_eta: string | null;
  seats: number;
  driver_location: { lat: number; lon: number; recorded_at: string } | null;
}
