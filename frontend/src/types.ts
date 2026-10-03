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
  trip_code: string;
  departure_at: string;
  trajectory_name: string;
}

export interface DriverRow {
  id: string;
  full_name: string;
  nin: string;
  phone: string;
  email: string | null;
}

export interface VehicleRow {
  id: string;
  matricule: string;
  seats: number;
  make: string | null;
  model: string | null;
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
}

export interface RefundDueRow {
  reservation_id: string;
  reservation_code: string;
  customer_name: string;
  customer_phone: string;
  refund_due: string;
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

export interface DomainErrorRow {
  sqlstate: string;
  code_name: string;
  ts_equivalent: string;
  description: string;
}
