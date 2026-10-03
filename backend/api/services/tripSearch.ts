import type { DBHelper } from '../../DB/DBHelper';
import { ApiError } from '../middleware/errors';

export interface TripSearchParams {
  fromWilayaId: number;
  toWilayaId: number;
  /**
   * Task 3.1 — optional finer "from-Commune/to-Commune search" on top of the
   * wilaya match: further restrict to trips whose pickup/dropoff WPoint
   * either has no curated commune subset configured (unrestricted — any
   * commune of the wilaya matches) or explicitly serves this commune.
   */
  fromCommuneId?: number;
  toCommuneId?: number;
  /** YYYY-MM-DD (interpreted in Africa/Algiers timezone). Either/both may be set — an open range. */
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
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

/**
 * Public trip search: published + scheduled + future trips whose trajectory
 * crosses FROM-wilaya before TO-wilaya and that have a defined trip_price
 * for that exact pair.
 */
export async function searchTrips(db: DBHelper, p: TripSearchParams): Promise<{ trips: TripSearchRow[]; total: number; page: number; page_size: number }> {
  const params: unknown[] = [p.fromWilayaId, p.toWilayaId];
  let dateFilter = '';
  if (p.dateFrom && p.dateTo) {
    params.push(p.dateFrom, p.dateTo);
    dateFilter = ` and (tr.departure_at at time zone 'Africa/Algiers')::date between $${params.length - 1}::date and $${params.length}::date`;
  } else if (p.dateFrom) {
    params.push(p.dateFrom);
    dateFilter = ` and (tr.departure_at at time zone 'Africa/Algiers')::date >= $${params.length}::date`;
  } else if (p.dateTo) {
    params.push(p.dateTo);
    dateFilter = ` and (tr.departure_at at time zone 'Africa/Algiers')::date <= $${params.length}::date`;
  }
  let communeFilter = '';
  if (p.fromCommuneId !== undefined) {
    params.push(p.fromCommuneId);
    communeFilter += ` and (not exists (select 1 from wpoint_commune wc where wc.wpoint_id = wpf.id)
                           or exists (select 1 from wpoint_commune wc where wc.wpoint_id = wpf.id and wc.commune_id = $${params.length}))`;
  }
  if (p.toCommuneId !== undefined) {
    params.push(p.toCommuneId);
    communeFilter += ` and (not exists (select 1 from wpoint_commune wc where wc.wpoint_id = wpt.id)
                           or exists (select 1 from wpoint_commune wc where wc.wpoint_id = wpt.id and wc.commune_id = $${params.length}))`;
  }
  params.push(p.pageSize);
  const limitIdx = params.length;
  params.push((p.page - 1) * p.pageSize);
  const offsetIdx = params.length;

  const rows = await db.raw<(TripSearchRow & { total_count: number | string })>(
    `select tr.id, tr.code, tr.departure_at, tr.arrival_eta, tr.capacity,
            tj.id as trajectory_id, tj.name as trajectory_name,
            wpf.id as pickup_wpoint_id,
            wf.nom_fr as from_wilaya, wf.nom_ar as from_wilaya_ar,
            wpt.id as dropoff_wpoint_id,
            wt.nom_fr as to_wilaya, wt.nom_ar as to_wilaya_ar,
            tp.price, tp.currency,
            seats_available(tr.id, wpf.id, wpt.id) as seats_available,
            count(*) over() as total_count
       from trip tr
       join trajectory tj  on tj.id = tr.trajectory_id
       join wpoint wpf     on wpf.trajectory_id = tj.id
       join wilaya wf      on wf.id = wpf.wilaya_id
       join wpoint wpt     on wpt.trajectory_id = tj.id and wpt.position > wpf.position
       join wilaya wt      on wt.id = wpt.wilaya_id
       join trip_price tp  on tp.trip_id = tr.id and tp.from_wpoint_id = wpf.id and tp.to_wpoint_id = wpt.id
      where tr.published_at is not null
        and tr.status = 'scheduled'
        and tr.departure_at > now()
        and wpf.wilaya_id = $1
        and wpt.wilaya_id = $2${communeFilter}${dateFilter}
      order by tr.departure_at
      limit $${limitIdx} offset $${offsetIdx}`,
    params,
  );
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return { trips: rows.map(({ total_count: _tc, ...t }) => t), total, page: p.page, page_size: p.pageSize };
}

/** Public trip detail: v_trip + ordered stops + price matrix. */
export async function getTripDetail(db: DBHelper, tripId: string): Promise<{
  trip: Record<string, unknown>;
  stops: Array<{ id: string; position: number; nom_fr: string; nom_ar: string; wilaya_id: number; eta: string | null }>;
  prices: Array<{ from_wpoint_id: string; to_wpoint_id: string; price: string; currency: string }>;
}> {
  const trip = await db.selectOne<Record<string, unknown>>('v_trip', { where: { id: tripId } });
  if (!trip || trip.published_at === null) throw new ApiError(404, 'TRIP_NOT_FOUND', 'Voyage introuvable');
  return getTripDetailUnrestricted(db, tripId, trip);
}

/**
 * Same as getTripDetail but without the "must be published" restriction —
 * used by the driver UI, which must be able to see its own assigned trip
 * (stops + fares) even before it's published to customers.
 */
export async function getTripDetailForDriver(db: DBHelper, tripId: string): Promise<{
  trip: Record<string, unknown>;
  stops: Array<{ id: string; position: number; nom_fr: string; nom_ar: string; wilaya_id: number; eta: string | null }>;
  prices: Array<{ from_wpoint_id: string; to_wpoint_id: string; price: string; currency: string }>;
}> {
  const trip = await db.selectOne<Record<string, unknown>>('v_trip', { where: { id: tripId } });
  if (!trip) throw new ApiError(404, 'TRIP_NOT_FOUND', 'Voyage introuvable');
  return getTripDetailUnrestricted(db, tripId, trip);
}

async function getTripDetailUnrestricted(
  db: DBHelper,
  tripId: string,
  trip: Record<string, unknown>,
): Promise<{
  trip: Record<string, unknown>;
  stops: Array<{ id: string; position: number; nom_fr: string; nom_ar: string; wilaya_id: number; eta: string | null }>;
  prices: Array<{ from_wpoint_id: string; to_wpoint_id: string; price: string; currency: string }>;
}> {
  const stops = await db.raw<{ id: string; position: number; nom_fr: string; nom_ar: string; wilaya_id: number; eta: string | null }>(
    `select wp.id, wp.position, w.nom_fr, w.nom_ar, w.id as wilaya_id, ts.eta
       from trip_stop ts
       join wpoint wp on wp.id = ts.wpoint_id
       join wilaya w  on w.id = wp.wilaya_id
      where ts.trip_id = $1
      order by wp.position`,
    [tripId],
  );
  const prices = await db.raw<{ from_wpoint_id: string; to_wpoint_id: string; price: string; currency: string }>(
    `select from_wpoint_id, to_wpoint_id, price, currency from trip_price where trip_id = $1`,
    [tripId],
  );
  return { trip, stops, prices };
}
