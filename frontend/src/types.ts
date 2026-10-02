export interface Wilaya {
  id: number;
  code: string;
  nom_fr: string;
  nom_ar: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'customer' | 'admin';
  email_verified: boolean;
  customer_id: string | null;
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
  nom_fr: string;
  nom_ar: string;
}
