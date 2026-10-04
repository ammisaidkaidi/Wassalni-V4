import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, apiUpload, fileUrl, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import { ConversationAction, RevealContactAction } from '../components/ReservationExtras';
import SosButton from '../components/SosButton';
import TripMap, { type MapPin, type MapStop } from '../components/TripMap';
import WpointManager from '../components/WpointManager';
import { useI18n } from '../i18n';
import type {
  DriverEarningsSummary,
  DriverProfileRow,
  DriverReservationRow,
  DriverTripRow,
  KycDocType,
  KycDocumentRow,
  MaintenanceStatus,
  PayoutBatchRow,
  PayoutLedgerRow,
  PricePair,
  RatingRow,
  RatingStatus,
  Stop,
  StopManifestEntry,
  TrajectoryRow,
  TripEtaResult,
  TripManifestRow,
  VehicleInspectionRow,
  VehicleRow,
  WaitlistEntryRow,
  Wilaya,
  WpointRow,
} from '../types';

const RESERVATION_STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

type Tab =
  | 'trips'
  | 'current'
  | 'reservations'
  | 'trajectories'
  | 'kyc'
  | 'vehicle-inspections'
  | 'ratings'
  | 'earnings'
  | 'settings';

export default function DriverPage() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('trips');

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'trips', label: t('driver.tabs.trips') },
    { id: 'current', label: t('driver.tabs.current') },
    { id: 'reservations', label: t('driver.tabs.reservations') },
    { id: 'trajectories', label: t('driver.tabs.trajectories') },
    { id: 'kyc', label: t('driver.tabs.kyc') },
    { id: 'vehicle-inspections', label: t('driver.tabs.vehicleInspections') },
    { id: 'ratings', label: t('driver.tabs.ratings') },
    { id: 'earnings', label: t('driver.tabs.earnings') },
    { id: 'settings', label: t('driver.tabs.settings') },
  ];

  if (loading) return <p className="empty">{t('driver.loading')}</p>;
  if (!user)
    return (
      <p className="empty">
        <Link to="/login?next=/driver">{t('driver.loginLink')}</Link> {t('driver.loginRequired')}
      </p>
    );
  if (user.role !== 'driver') return <p className="empty">{t('driver.forbidden')}</p>;

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <h1>{t('driver.title')}</h1>
        <SosButton role="driver" />
      </div>
      <div className="tabs">
        {TABS.map((tb) => (
          <button key={tb.id} className={`tab${tab === tb.id ? ' active' : ''}`} onClick={() => setTab(tb.id)}>
            {tb.label}
          </button>
        ))}
      </div>
      {tab === 'trips' && <MesVoyagesTab />}
      {tab === 'current' && <TrajetEnCoursTab />}
      {tab === 'reservations' && <ReservationsTab />}
      {tab === 'trajectories' && <TrajectoiresTab />}
      {tab === 'kyc' && <KycTab />}
      {tab === 'vehicle-inspections' && <VehicleInspectionsTab />}
      {tab === 'ratings' && <DriverRatingsTab />}
      {tab === 'earnings' && <EarningsTab />}
      {tab === 'settings' && <ParametresTab />}
    </section>
  );
}

// ── Mes voyages ──────────────────────────────────────────────────────────────

function MesVoyagesTab() {
  const { t } = useI18n();
  const [trips, setTrips] = useState<DriverTripRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api<{ trips: DriverTripRow[] }>('/api/driver/trips');
      setTrips(r.trips);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = trips.filter((tr) => tr.status === 'in_progress');
  const upcoming = trips.filter((tr) => tr.status === 'scheduled');
  const history = trips.filter((tr) => tr.status === 'completed' || tr.status === 'cancelled');
  const selected = trips.find((tr) => tr.id === selectedId) ?? null;

  return (
    <div>
      {msg && (
        <p className="alert error" role="alert">
          {msg}
        </p>
      )}
      {selected ? (
        <DriverTripDetail
          trip={selected}
          onBack={() => setSelectedId(null)}
          onChanged={() => {
            void load();
          }}
        />
      ) : trips.length === 0 ? (
        <p className="empty">{t('driver.trips.noTripsAssigned')}</p>
      ) : (
        <>
          <TripGroup title={t('driver.trips.inProgress')} trips={active} onOpen={setSelectedId} />
          <TripGroup title={t('driver.trips.upcoming')} trips={upcoming} onOpen={setSelectedId} />
          <TripGroup title={t('driver.trips.history')} trips={history} onOpen={setSelectedId} />
        </>
      )}
    </div>
  );
}

function TripGroup({ title, trips, onOpen }: { title: string; trips: DriverTripRow[]; onOpen: (id: string) => void }) {
  const { t } = useI18n();
  if (trips.length === 0) return null;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('driver.trips.code')}</th>
              <th>{t('driver.trips.trajectory')}</th>
              <th>{t('driver.trips.departure')}</th>
              <th>{t('driver.trips.vehicle')}</th>
              <th>{t('driver.trips.status')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {trips.map((tr) => (
              <tr key={tr.id}>
                <td>{tr.code}</td>
                <td>{tr.trajectory_name}</td>
                <td>{fmtDateTime(tr.departure_at)}</td>
                <td>{tr.vehicle_matricule ?? '—'}</td>
                <td>{t(`status.trip.${tr.status}`)}</td>
                <td>
                  <button className="btn ghost small" onClick={() => onOpen(tr.id)}>
                    {t('driver.trips.open')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface DriverTripDetailData {
  trip: DriverTripRow;
  stops: Stop[];
  prices: PricePair[];
  manifest: TripManifestRow[];
}

function DriverTripDetail({ trip, onBack, onChanged }: { trip: DriverTripRow; onBack: () => void; onChanged: () => void }) {
  const { t } = useI18n();
  const [data, setData] = useState<DriverTripDetailData | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSendRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const r = await api<DriverTripDetailData>(`/api/driver/trips/${trip.id}`);
      setData(r);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, [trip.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const stopSharing = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setSharing(false);
  }, []);

  // Stop pushing GPS if we navigate away from this trip's detail view.
  useEffect(() => () => stopSharing(), [stopSharing]);

  const toggleSharing = (): void => {
    if (sharing) {
      stopSharing();
      return;
    }
    if (!('geolocation' in navigator)) {
      setMsg(t('driver.trips.geoUnsupported'));
      return;
    }
    setMsg('');
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSendRef.current < 10_000) return; // throttle: at most 1 push / 10s
        lastSendRef.current = now;
        api(`/api/driver/trips/${trip.id}/location`, {
          method: 'POST',
          body: { gps_lat: pos.coords.latitude, gps_lon: pos.coords.longitude },
        })
          .then(() => setLastSent(new Date().toLocaleTimeString('fr-FR')))
          .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
      },
      (err) => setMsg(t('driver.trips.geoError', { message: err.message })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
    );
    watchIdRef.current = id;
    setSharing(true);
  };

  const start = async (): Promise<void> => {
    setBusy(true);
    setMsg('');
    try {
      await api(`/api/driver/trips/${trip.id}/start`, { method: 'POST' });
      await load();
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const complete = async (): Promise<void> => {
    setBusy(true);
    setMsg('');
    try {
      stopSharing();
      await api(`/api/driver/trips/${trip.id}/complete`, { method: 'POST' });
      await load();
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (): Promise<void> => {
    if (!confirm(t('driver.trips.confirmCancel'))) return;
    setBusy(true);
    setMsg('');
    try {
      await api(`/api/driver/trips/${trip.id}/cancel`, { method: 'POST' });
      await load();
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const status = data?.trip.status ?? trip.status;

  return (
    <div className="card">
      <button className="btn ghost small" onClick={onBack} style={{ marginBottom: 12 }}>
        {t('driver.trips.back')}
      </button>
      <h2 style={{ marginTop: 0 }}>
        {trip.code} — {trip.trajectory_name}
      </h2>
      <p className="muted">
        {t('driver.trips.departure')} {fmtDateTime(trip.departure_at)} · {t('driver.trips.seatsUnit', { n: trip.capacity })} ·{' '}
        {trip.vehicle_matricule ?? t('driver.trips.vehicleUnassigned')} · {t('driver.trips.statusLabel')}{' '}
        <strong>{t(`status.trip.${status}`)}</strong>
      </p>

      {msg && (
        <p className="alert error" role="alert">
          {msg}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {status === 'scheduled' && (
          <>
            <button className="btn primary" disabled={busy} onClick={() => void start()}>
              {t('driver.trips.startTrip')}
            </button>
            <button className="btn danger" disabled={busy} onClick={() => void cancel()}>
              {t('driver.trips.cancelTrip')}
            </button>
          </>
        )}
        {status === 'in_progress' && (
          <>
            <button className={`btn ${sharing ? 'danger' : 'primary'}`} onClick={toggleSharing}>
              {sharing ? t('driver.trips.stopSharing') : t('driver.trips.shareLocation')}
            </button>
            <button className="btn ghost" disabled={busy} onClick={() => void complete()}>
              {t('driver.trips.completeTrip')}
            </button>
          </>
        )}
      </div>
      {sharing && (
        <p className="muted">
          {t('driver.trips.sharingLive')}
          {lastSent ? t('driver.trips.lastSent', { time: lastSent }) : '…'}
        </p>
      )}

      {data && (
        <>
          <h3>{t('driver.trips.stops')}</h3>
          <ol>
            {data.stops.map((s) => (
              <li key={s.id}>
                {s.nom_fr}
                {s.eta ? `${t('driver.trips.etaPrefix')}${fmtDateTime(s.eta)}` : ''}
              </li>
            ))}
          </ol>

          <h3>{t('driver.trips.passengers', { seats: data.manifest.reduce((n, m) => n + m.seats, 0) })}</h3>
          {data.manifest.length === 0 ? (
            <p className="muted">{t('driver.trips.noReservations')}</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('driver.trips.customer')}</th>
                    <th>{t('driver.trips.phone')}</th>
                    <th>{t('driver.trips.seats')}</th>
                    <th>{t('driver.trips.pickup')}</th>
                    <th>{t('driver.trips.dropoff')}</th>
                    <th>{t('driver.trips.status')}</th>
                    <th>{t('driver.trips.contact')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.manifest.map((m) => (
                    <tr key={m.id}>
                      <td>{m.customer_name}</td>
                      <td>{m.customer_phone}</td>
                      <td>{m.seats}</td>
                      <td>{m.pickup ?? '—'}</td>
                      <td>{m.dropoff ?? '—'}</td>
                      <td>{t(`status.reservation.${m.status}`)}</td>
                      <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <ConversationAction apiBase={`/api/driver/reservations/${m.id}`} myRole="driver" />
                        <RevealContactAction apiBase={`/api/driver/reservations/${m.id}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <WaitlistPanel tripId={trip.id} />
        </>
      )}
    </div>
  );
}

/** Task 10.2 — waitlist queue for this specific trip, driver-visible (read-only). */
function WaitlistPanel({ tripId }: { tripId: string }) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<WaitlistEntryRow[]>([]);
  useEffect(() => {
    api<{ entries: WaitlistEntryRow[] }>(`/api/driver/trips/${tripId}/waitlist`)
      .then((r) => setEntries(r.entries))
      .catch(() => setEntries([]));
  }, [tripId]);
  if (entries.length === 0) return null;
  return (
    <>
      <h3>{t('driver.trips.waitlistTitle', { count: entries.length })}</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('driver.trips.position')}</th>
              <th>{t('driver.trips.customer')}</th>
              <th>{t('driver.trips.seats')}</th>
              <th>{t('driver.trips.status')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.position}</td>
                <td>{e.customer_name ?? '—'}</td>
                <td>{e.seats}</td>
                <td>{t(`status.waitlist.${e.status}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Trajet en cours ──────────────────────────────────────────────────────────

interface CurrentTripDetailData {
  trip: DriverTripRow;
  stops: Stop[];
  manifest: TripManifestRow[];
  stop_manifest: StopManifestEntry[];
}

/** Picks the trip to feature: the one actively in_progress, else the soonest upcoming scheduled one. */
function pickCurrentTrip(trips: DriverTripRow[]): DriverTripRow | null {
  const inProgress = trips.find((t) => t.status === 'in_progress');
  if (inProgress) return inProgress;
  const upcoming = trips
    .filter((t) => t.status === 'scheduled')
    .sort((a, b) => new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime());
  return upcoming[0] ?? null;
}

function TrajetEnCoursTab() {
  const { t } = useI18n();
  const [trip, setTrip] = useState<DriverTripRow | null>(null);
  const [data, setData] = useState<CurrentTripDetailData | null>(null);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [msg, setMsg] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [eta, setEta] = useState<TripEtaResult | null>(null);
  const [etaMsg, setEtaMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [tr, w] = await Promise.all([
        api<{ trips: DriverTripRow[] }>('/api/driver/trips'),
        api<{ wilayas: Wilaya[] }>('/api/registry/wilayas'),
      ]);
      setWilayas(w.wilayas);
      const current = pickCurrentTrip(tr.trips);
      setTrip(current);
      if (current) {
        const d = await api<CurrentTripDetailData>(`/api/driver/trips/${current.id}`);
        setData(d);
      } else {
        setData(null);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadEta = useCallback(async (tripId: string) => {
    try {
      setEta(await api<TripEtaResult>(`/api/driver/trips/${tripId}/eta`));
    } catch (e) {
      setEtaMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Task 4.3 — live ETA: recompute on a short interval while the trip is
  // in_progress (it's derived on read from the latest GPS ping, never
  // stored, so re-fetching is the "update mechanism").
  useEffect(() => {
    if (!trip || trip.status !== 'in_progress') {
      setEta(null);
      return;
    }
    void loadEta(trip.id);
    const id = window.setInterval(() => void loadEta(trip.id), 30_000);
    return () => window.clearInterval(id);
  }, [trip, loadEta]);

  const wilayaCoords = useMemo(() => {
    const m = new Map<number, { lat: number; lon: number }>();
    for (const w of wilayas) if (w.lat != null && w.lon != null) m.set(w.id, { lat: w.lat, lon: w.lon });
    return m;
  }, [wilayas]);

  const mapStops: MapStop[] = useMemo(() => {
    if (!data) return [];
    return data.stops
      .map((s) => {
        const c = wilayaCoords.get(s.wilaya_id);
        return c ? { id: s.id, label: s.nom_fr, lat: c.lat, lon: c.lon } : null;
      })
      .filter((s): s is MapStop => s !== null);
  }, [data, wilayaCoords]);

  const mapPins: MapPin[] = useMemo(() => {
    if (!data) return [];
    const pins: MapPin[] = [];
    for (const m of data.manifest) {
      const lat = m.pickup_lat != null ? Number(m.pickup_lat) : (m.pickup_wilaya_id != null ? wilayaCoords.get(m.pickup_wilaya_id)?.lat : undefined);
      const lon = m.pickup_lon != null ? Number(m.pickup_lon) : (m.pickup_wilaya_id != null ? wilayaCoords.get(m.pickup_wilaya_id)?.lon : undefined);
      if (lat == null || lon == null) continue;
      const precise = m.pickup_lat != null;
      pins.push({
        id: m.id,
        label: `${m.customer_name} — ${m.status}${precise ? '' : ' (approx.)'}`,
        lat,
        lon,
        color: RESERVATION_STATUS_COLOR[m.status] ?? '#6b7280',
      });
    }
    return pins;
  }, [data, wilayaCoords]);

  if (!loaded) return <p className="empty">{t('driver.loading')}</p>;
  if (msg)
    return (
      <p className="alert error" role="alert">
        {msg}
      </p>
    );
  if (!trip) return <p className="empty">{t('driver.current.noCurrentTrip')}</p>;

  const seatsReserved = data?.manifest.reduce((n, m) => n + m.seats, 0) ?? 0;

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>
          {trip.code} — {trip.trajectory_name} <span className={`chip ${trip.status}`}>{t(`status.trip.${trip.status}`)}</span>
        </h2>
        <p className="muted">
          {t('driver.trips.departure')} {fmtDateTime(trip.departure_at)} · {t('driver.trips.seatsUnit', { n: trip.capacity })} ·{' '}
          {trip.vehicle_matricule ?? t('driver.trips.vehicleUnassigned')} · {t('driver.current.seatsReserved', { count: seatsReserved })}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{t('driver.current.mapTitle')}</h2>
        <p className="muted small">
          {t('driver.current.mapLegend')}{' '}
          <span style={{ color: RESERVATION_STATUS_COLOR.pending }}>{t('driver.current.legendPending')}</span>{' '}
          <span style={{ color: RESERVATION_STATUS_COLOR.confirmed }}>{t('driver.current.legendConfirmed')}</span>{' '}
          <span style={{ color: RESERVATION_STATUS_COLOR.completed }}>{t('driver.current.legendCompleted')}</span>.{' '}
          {t('driver.current.mapApproxNote')}
        </p>
        {mapStops.length === 0 ? (
          <p className="empty">{t('driver.current.noMapCoords')}</p>
        ) : (
          <TripMap stops={mapStops} pins={mapPins} height={420} />
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{t('driver.current.etaTitle')}</h2>
        {etaMsg && (
          <p className="alert error" role="alert">
            {etaMsg}
          </p>
        )}
        {trip.status !== 'in_progress' ? (
          <p className="muted small">{t('driver.etaReason.not_in_progress')}</p>
        ) : (
          <>
            <p className="muted small">
              {eta?.position_age_seconds != null
                ? t('driver.current.positionReceivedAgo', { minutes: Math.round(eta.position_age_seconds / 60) })
                : t('driver.current.waitingForGps')}{' '}
              <button className="btn ghost small" onClick={() => void loadEta(trip.id)}>
                {t('driver.current.refresh')}
              </button>
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('driver.current.stop')}</th>
                    <th>{t('driver.current.distance')}</th>
                    <th>{t('driver.current.estimatedArrival')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(eta?.stops ?? []).map((s) => (
                    <tr key={s.wpoint_id}>
                      <td>{s.wpoint_name}</td>
                      <td>{s.distance_km != null ? `${s.distance_km} km` : '—'}</td>
                      <td>
                        {s.eta ? (
                          fmtDateTime(s.eta)
                        ) : (
                          <span className="muted small">{s.reason ? t(`driver.etaReason.${s.reason}`) : '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">{t('driver.current.etaApproxNote')}</p>
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{t('driver.current.manifestTitle')}</h2>
        {!data || data.stop_manifest.length === 0 ? (
          <p className="empty">{t('driver.current.noStopsForTrip')}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('driver.current.stop')}</th>
                  <th>{t('driver.current.boarding')}</th>
                  <th>{t('driver.current.alighting')}</th>
                  <th>{t('driver.current.seatsIn')}</th>
                  <th>{t('driver.current.seatsOut')}</th>
                  <th>{t('driver.current.aboardAfter')}</th>
                  <th>{t('driver.current.remainingSeats')}</th>
                </tr>
              </thead>
              <tbody>
                {data.stop_manifest.map((s) => (
                  <tr key={s.wpoint_id}>
                    <td>{s.wpoint_name}</td>
                    <td>{s.boarding.length === 0 ? '—' : s.boarding.map((p) => `${p.customer_name} (${p.seats})`).join(', ')}</td>
                    <td>{s.alighting.length === 0 ? '—' : s.alighting.map((p) => `${p.customer_name} (${p.seats})`).join(', ')}</td>
                    <td>{s.seats_entering}</td>
                    <td>{s.seats_leaving}</td>
                    <td>{s.seats_aboard_after}</td>
                    <td>{s.remaining_capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t('driver.current.reservationsTitle', { count: data?.manifest.length ?? 0 })}</h2>
        {!data || data.manifest.length === 0 ? (
          <p className="empty">{t('driver.trips.noReservations')}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('driver.trips.customer')}</th>
                  <th>{t('driver.trips.phone')}</th>
                  <th>{t('driver.trips.seats')}</th>
                  <th>{t('driver.trips.pickup')}</th>
                  <th>{t('driver.trips.dropoff')}</th>
                  <th>{t('driver.current.positionCol')}</th>
                  <th>{t('driver.trips.status')}</th>
                </tr>
              </thead>
              <tbody>
                {data.manifest.map((m) => (
                  <tr key={m.id}>
                    <td>{m.customer_name}</td>
                    <td>{m.customer_phone}</td>
                    <td>{m.seats}</td>
                    <td>{m.pickup ?? '—'}</td>
                    <td>{m.dropoff ?? '—'}</td>
                    <td>{m.pickup_lat != null ? t('driver.current.precise') : t('driver.current.approximate')}</td>
                    <td>
                      <span className={`chip ${m.status}`}>{t(`status.reservation.${m.status}`)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Réservations ─────────────────────────────────────────────────────────────

function ReservationsTab() {
  const { t } = useI18n();
  const [rows, setRows] = useState<DriverReservationRow[]>([]);
  const [status, setStatus] = useState<string>('pending');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (s: string) => {
    try {
      const qs = s ? `?status=${encodeURIComponent(s)}` : '';
      const r = await api<{ reservations: DriverReservationRow[] }>(`/api/driver/reservations${qs}`);
      setRows(r.reservations);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load(status);
  }, [load, status]);

  const act = async (id: string, action: 'confirm' | 'decline'): Promise<void> => {
    setBusyId(id);
    setMsg('');
    try {
      await api(`/api/driver/reservations/${id}/${action}`, { method: 'POST' });
      setMsg(action === 'confirm' ? t('driver.reservations.confirmed') : t('driver.reservations.declined'));
      await load(status);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="form-inline select-row">
        <label htmlFor="driver-reservations-filter">
          {t('driver.reservations.filter')}
          <select id="driver-reservations-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">{t('driver.reservations.statusPending')}</option>
            <option value="confirmed">{t('driver.reservations.statusConfirmed')}</option>
            <option value="completed">{t('driver.reservations.statusCompleted')}</option>
            <option value="cancelled">{t('driver.reservations.statusCancelled')}</option>
            <option value="">{t('driver.reservations.statusAll')}</option>
          </select>
        </label>
      </div>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="empty">{t('driver.reservations.none')}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('driver.reservations.code')}</th>
                <th>{t('driver.reservations.trip')}</th>
                <th>{t('driver.reservations.departure')}</th>
                <th>{t('driver.reservations.customer')}</th>
                <th>{t('driver.reservations.phone')}</th>
                <th>{t('driver.reservations.seats')}</th>
                <th>{t('driver.reservations.pickupDropoff')}</th>
                <th>{t('driver.reservations.price')}</th>
                <th>{t('driver.reservations.status')}</th>
                <th>{t('driver.reservations.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.code}</td>
                  <td>
                    {r.trip_code} — {r.trajectory_name}
                  </td>
                  <td>{fmtDateTime(r.departure_at)}</td>
                  <td>{r.customer_name}</td>
                  <td>{r.customer_phone}</td>
                  <td>{r.seats}</td>
                  <td>
                    {r.pickup ?? '—'} → {r.dropoff ?? '—'}
                  </td>
                  <td>
                    {r.total_price} {r.currency}
                  </td>
                  <td>
                    <span className={`chip ${r.status}`}>{t(`status.reservation.${r.status}`)}</span>
                  </td>
                  <td className="actions">
                    {r.status === 'pending' && (
                      <>
                        <button className="btn primary small" disabled={busyId === r.id} onClick={() => void act(r.id, 'confirm')}>
                          {t('driver.reservations.confirm')}
                        </button>
                        <button className="btn danger small" disabled={busyId === r.id} onClick={() => void act(r.id, 'decline')}>
                          {t('driver.reservations.decline')}
                        </button>
                      </>
                    )}
                    {r.status === 'completed' && <RateCustomerAction reservationId={r.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RateCustomerAction({ reservationId }: { reservationId: string }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<RatingStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ rating_status: RatingStatus }>(`/api/driver/reservations/${reservationId}/rating-status`)
      .then((r) => setStatus(r.rating_status))
      .catch(() => setStatus(null));
  }, [reservationId]);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await api(`/api/driver/reservations/${reservationId}/rate-customer`, { method: 'POST', body: { stars, review: review || undefined } });
      setStatus({ customer_to_driver: status?.customer_to_driver ?? false, driver_to_customer: true });
      setOpen(false);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (status?.driver_to_customer) return <span className="chip confirmed">{t('driver.reservations.customerRated')}</span>;

  return (
    <span>
      <button className="btn ghost small" onClick={() => setOpen(!open)}>
        {t('driver.reservations.rateCustomer')}
      </button>
      {open && (
        <form className="form-inline" style={{ marginTop: 6 }} onSubmit={(e) => void submit(e)}>
          {msg && (
            <span className="alert error small" role="alert">
              {msg}
            </span>
          )}
          <select value={stars} onChange={(e) => setStars(Number(e.target.value))} aria-label={t('driver.reservations.rateCustomer')}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)}
              </option>
            ))}
          </select>
          <input
            placeholder={t('driver.reservations.reviewPlaceholder')}
            aria-label={t('driver.reservations.reviewPlaceholder')}
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
          <button className="btn primary small" disabled={busy}>
            {t('driver.reservations.send')}
          </button>
        </form>
      )}
    </span>
  );
}

// ── Trajectoires ─────────────────────────────────────────────────────────────

function TrajectoiresTab() {
  const { t } = useI18n();
  const [rows, setRows] = useState<TrajectoryRow[]>([]);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [wpoints, setWpoints] = useState<WpointRow[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState({ from: '', to: '', amount: '' });
  const [tripForm, setTripForm] = useState({ departure_at: '', capacity: '4', seat_price: '0' });
  const [msg, setMsg] = useState('');
  const [lastTripId, setLastTripId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [tr, w] = await Promise.all([
      api<{ trajectories: TrajectoryRow[] }>('/api/driver/trajectories'),
      api<{ wilayas: Wilaya[] }>('/api/registry/wilayas'),
    ]);
    setRows(tr.trajectories);
    setWilayas(w.wilayas);
  }, []);

  useEffect(() => {
    load().catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, [load]);

  useEffect(() => {
    setPrice({ from: '', to: '', amount: '' });
  }, [selected]);

  const create = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      const r = await api<{ id: string }>('/api/driver/trajectories', { method: 'POST', body: { name } });
      setName('');
      setMsg(t('driver.trajectories.trajectoryCreated'));
      await load();
      setSelected(r.id);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const setDefaultPrice = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api(`/api/driver/trajectories/${selected}/prices`, {
        method: 'POST',
        body: { from_wpoint_id: price.from, to_wpoint_id: price.to, price: Number(price.amount) },
      });
      setMsg(t('driver.trajectories.defaultPriceSaved'));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const createTrip = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      const r = await api<{ id: string }>('/api/driver/trips', {
        method: 'POST',
        body: {
          trajectory_id: selected,
          departure_at: new Date(tripForm.departure_at).toISOString(),
          capacity: Number(tripForm.capacity),
          seat_price: Number(tripForm.seat_price),
        },
      });
      setLastTripId(r.id);
      setMsg(t('driver.trajectories.tripCreatedDraft'));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const populateAndPublish = async (): Promise<void> => {
    if (!lastTripId) return;
    setMsg('');
    try {
      await api(`/api/driver/trips/${lastTripId}/stops`, { method: 'POST', body: {} });
      await api(`/api/driver/trips/${lastTripId}/prices/populate`, { method: 'POST', body: {} });
      await api(`/api/driver/trips/${lastTripId}/publish`, { method: 'POST', body: {} });
      setMsg(t('driver.trajectories.tripPublished'));
      setLastTripId(null);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="card form-inline" onSubmit={(e) => void create(e)}>
        <label htmlFor="driver-new-trajectory">
          {t('driver.trajectories.newTrajectory')}
          <input
            id="driver-new-trajectory"
            required
            minLength={2}
            placeholder={t('driver.trajectories.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button className="btn primary">{t('driver.trajectories.create')}</button>
      </form>

      <div className="form-inline select-row">
        <label htmlFor="driver-trajectory-select">
          {t('driver.trajectories.manage')}
          <select id="driver-trajectory-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">{t('driver.trajectories.pickTrajectory')}</option>
            {rows.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.name} ({t('driver.trajectories.stopsCount', { n: tr.nb_wpoints })})
              </option>
            ))}
          </select>
        </label>
      </div>

      {selected && (
        <div className="detail-grid">
          <div className="card">
            <h2>{t('driver.trajectories.stopsTitle')}</h2>
            <WpointManager basePath="/api/driver" trajectoryId={selected} wilayas={wilayas} onWpointsChange={setWpoints} />
          </div>

          <div className="card">
            <h2>{t('driver.trajectories.defaultPriceTitle')}</h2>
            <form className="form-grid" onSubmit={(e) => void setDefaultPrice(e)}>
              <label htmlFor="driver-price-from">
                {t('driver.trajectories.from')}
                <select id="driver-price-from" required value={price.from} onChange={(e) => setPrice({ ...price, from: e.target.value })}>
                  <option value="">{t('driver.trajectories.pickOption')}</option>
                  {wpoints.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nom_fr}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="driver-price-to">
                {t('driver.trajectories.to')}
                <select id="driver-price-to" required value={price.to} onChange={(e) => setPrice({ ...price, to: e.target.value })}>
                  <option value="">{t('driver.trajectories.pickOption')}</option>
                  {wpoints.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nom_fr}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="driver-price-amount">
                {t('driver.trajectories.price')}
                <input
                  id="driver-price-amount"
                  type="number"
                  min={0}
                  required
                  value={price.amount}
                  onChange={(e) => setPrice({ ...price, amount: e.target.value })}
                />
              </label>
              <button className="btn primary">{t('driver.trajectories.save')}</button>
            </form>
          </div>

          <div className="card">
            <h2>{t('driver.trajectories.createTripTitle')}</h2>
            <form className="form-grid" onSubmit={(e) => void createTrip(e)}>
              <label htmlFor="driver-trip-departure">
                {t('driver.trajectories.departure')}
                <input
                  id="driver-trip-departure"
                  type="datetime-local"
                  required
                  value={tripForm.departure_at}
                  onChange={(e) => setTripForm({ ...tripForm, departure_at: e.target.value })}
                />
              </label>
              <label htmlFor="driver-trip-capacity">
                {t('driver.trajectories.capacity')}
                <input
                  id="driver-trip-capacity"
                  type="number"
                  min={1}
                  required
                  value={tripForm.capacity}
                  onChange={(e) => setTripForm({ ...tripForm, capacity: e.target.value })}
                />
              </label>
              <label htmlFor="driver-trip-seat-price">
                {t('driver.trajectories.fallbackPrice')}
                <input
                  id="driver-trip-seat-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={tripForm.seat_price}
                  onChange={(e) => setTripForm({ ...tripForm, seat_price: e.target.value })}
                />
              </label>
              <button className="btn primary">{t('driver.trajectories.createTrip')}</button>
            </form>
            {lastTripId && (
              <p className="muted" style={{ marginTop: 12 }}>
                {t('driver.trajectories.tripCreated')}{' '}
                <button className="btn ghost small" onClick={() => void populateAndPublish()}>
                  {t('driver.trajectories.populateAndPublish')}
                </button>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Paramètres ───────────────────────────────────────────────────────────────

function ParametresTab() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<DriverProfileRow | null>(null);
  const [vehicle, setVehicle] = useState<VehicleRow | null>(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', email: '', address: '' });
  const [vehicleForm, setVehicleForm] = useState({
    matricule: '',
    seats: '4',
    make: '',
    model: '',
    wheelchair_accessible: false,
    pets_allowed: true,
    luggage_capacity: '',
  });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api<{ driver: DriverProfileRow; vehicle: VehicleRow | null }>('/api/driver/me');
      setProfile(r.driver);
      setVehicle(r.vehicle);
      setProfileForm({
        full_name: r.driver.full_name,
        phone: r.driver.phone,
        email: r.driver.email ?? '',
        address: r.driver.address ?? '',
      });
      if (r.vehicle) {
        setVehicleForm({
          matricule: r.vehicle.matricule,
          seats: String(r.vehicle.seats),
          make: r.vehicle.make ?? '',
          model: r.vehicle.model ?? '',
          wheelchair_accessible: r.vehicle.wheelchair_accessible ?? false,
          pets_allowed: r.vehicle.pets_allowed ?? true,
          luggage_capacity: r.vehicle.luggage_capacity != null ? String(r.vehicle.luggage_capacity) : '',
        });
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/driver/me', {
        method: 'PATCH',
        body: {
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          email: profileForm.email || null,
          address: profileForm.address || null,
        },
      });
      setMsg(t('driver.settings.profileUpdated'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const saveVehicle = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      const body = {
        matricule: vehicleForm.matricule,
        seats: Number(vehicleForm.seats),
        make: vehicleForm.make || null,
        model: vehicleForm.model || null,
        wheelchair_accessible: vehicleForm.wheelchair_accessible,
        pets_allowed: vehicleForm.pets_allowed,
        luggage_capacity: vehicleForm.luggage_capacity !== '' ? Number(vehicleForm.luggage_capacity) : null,
      };
      if (vehicle) {
        await api('/api/driver/vehicle', { method: 'PATCH', body });
        setMsg(t('driver.settings.vehicleUpdated'));
      } else {
        // Accessibility fields aren't accepted by the creation endpoint (only
        // matricule/seats/make/model) — immediately follow up with a PATCH so
        // they still take effect from the very first save, not just the next one.
        await api('/api/driver/vehicle', { method: 'POST', body });
        await api('/api/driver/vehicle', {
          method: 'PATCH',
          body: { wheelchair_accessible: body.wheelchair_accessible, pets_allowed: body.pets_allowed, luggage_capacity: body.luggage_capacity },
        });
        setMsg(t('driver.settings.vehicleSaved'));
      }
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  if (!profile)
    return msg ? (
      <p className="alert error" role="alert">
        {msg}
      </p>
    ) : (
      <p className="empty">{t('driver.loading')}</p>
    );

  return (
    <div className="detail-grid">
      {msg && (
        <p className="alert info" style={{ gridColumn: '1 / -1' }} role="status">
          {msg}
        </p>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t('driver.settings.myProfile')}</h2>
        <p className="muted small">{t('driver.settings.ninNote', { nin: profile.nin })}</p>
        <p>
          {profile.rating_count > 0 ? (
            t('driver.settings.ratingSummary', {
              avg: Number(profile.rating_avg).toFixed(1),
              count: profile.rating_count,
              s: profile.rating_count > 1 ? 's' : '',
            })
          ) : (
            <span className="muted">{t('driver.settings.noRatings')}</span>
          )}
          {profile.trust_badge && (
            <span className="chip confirmed" style={{ marginLeft: 8 }}>
              {t('driver.settings.trustBadge')}
            </span>
          )}
        </p>
        {profile.no_show_count > 0 && (
          <p className={`alert ${profile.flagged_at ? 'error' : 'info'}`} role={profile.flagged_at ? 'alert' : 'status'}>
            {t('driver.settings.noShowWarning', {
              count: profile.no_show_count,
              flagged: profile.flagged_at ? t('driver.settings.flaggedSuffix') : '',
            })}
          </p>
        )}
        <form className="form-grid" onSubmit={(e) => void saveProfile(e)}>
          <label htmlFor="driver-profile-name">
            {t('driver.settings.fullName')}
            <input
              id="driver-profile-name"
              required
              minLength={2}
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
            />
          </label>
          <label htmlFor="driver-profile-phone">
            {t('driver.settings.phone')}
            <input
              id="driver-profile-phone"
              required
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />
          </label>
          <label htmlFor="driver-profile-email">
            {t('driver.settings.email')}
            <input
              id="driver-profile-email"
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
          </label>
          <label htmlFor="driver-profile-address">
            {t('driver.settings.address')}
            <input
              id="driver-profile-address"
              value={profileForm.address}
              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
            />
          </label>
          <button className="btn primary">{t('driver.settings.save')}</button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t('driver.settings.myVehicle')}</h2>
        {!vehicle && <p className="muted small">{t('driver.settings.noVehicle')}</p>}
        {vehicle && <p className="muted small">{t('driver.settings.inspectionHint')}</p>}
        <form className="form-grid" onSubmit={(e) => void saveVehicle(e)}>
          <label htmlFor="driver-vehicle-matricule">
            {t('driver.settings.matricule')}
            <input
              id="driver-vehicle-matricule"
              required
              minLength={3}
              value={vehicleForm.matricule}
              onChange={(e) => setVehicleForm({ ...vehicleForm, matricule: e.target.value })}
            />
          </label>
          <label htmlFor="driver-vehicle-seats">
            {t('driver.settings.seats')}
            <input
              id="driver-vehicle-seats"
              type="number"
              min={1}
              required
              value={vehicleForm.seats}
              onChange={(e) => setVehicleForm({ ...vehicleForm, seats: e.target.value })}
            />
          </label>
          <label htmlFor="driver-vehicle-make">
            {t('driver.settings.make')}
            <input id="driver-vehicle-make" value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })} />
          </label>
          <label htmlFor="driver-vehicle-model">
            {t('driver.settings.model')}
            <input id="driver-vehicle-model" value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} />
          </label>
          <label htmlFor="driver-vehicle-luggage">
            {t('driver.settings.luggageCapacity')}
            <input
              id="driver-vehicle-luggage"
              type="number"
              min={0}
              value={vehicleForm.luggage_capacity}
              onChange={(e) => setVehicleForm({ ...vehicleForm, luggage_capacity: e.target.value })}
            />
          </label>
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={vehicleForm.wheelchair_accessible}
              onChange={(e) => setVehicleForm({ ...vehicleForm, wheelchair_accessible: e.target.checked })}
            />
            {t('driver.settings.wheelchairAccessible')}
          </label>
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={vehicleForm.pets_allowed}
              onChange={(e) => setVehicleForm({ ...vehicleForm, pets_allowed: e.target.checked })}
            />
            {t('driver.settings.petsAllowed')}
          </label>
          <button className="btn primary">{vehicle ? t('driver.settings.update') : t('driver.settings.save')}</button>
        </form>
      </div>
    </div>
  );
}

// ── Contrôle technique (Task 6.2) ────────────────────────────────────────────

function VehicleInspectionsTab() {
  const { t } = useI18n();
  const [inspections, setInspections] = useState<VehicleInspectionRow[]>([]);
  const [eligible, setEligible] = useState(false);
  const [form, setForm] = useState({ inspection_date: '', expiry_date: '', maintenance_status: 'ok' as MaintenanceStatus, notes: '' });
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ inspections: VehicleInspectionRow[]; eligible: boolean }>('/api/driver/vehicle/inspections');
      setInspections(r.inspections);
      setEligible(r.eligible);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      if (file) {
        await apiUpload('/api/driver/vehicle/inspections', file, {
          inspection_date: form.inspection_date,
          expiry_date: form.expiry_date,
          maintenance_status: form.maintenance_status,
          notes: form.notes,
        });
      } else {
        await api('/api/driver/vehicle/inspections', { method: 'POST', body: { ...form, notes: form.notes || undefined } });
      }
      setForm({ inspection_date: '', expiry_date: '', maintenance_status: 'ok', notes: '' });
      setFile(null);
      setMsg(t('driver.inspections.sent'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="muted">{t('driver.inspections.eligibilityNote')}</p>
      <p>
        {eligible ? (
          <span className="chip confirmed">{t('driver.inspections.eligible')}</span>
        ) : (
          <span className="chip cancelled">{t('driver.inspections.notEligible')}</span>
        )}
      </p>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="card form-grid" onSubmit={(e) => void submit(e)}>
        <label htmlFor="inspection-date">
          {t('driver.inspections.inspectionDate')}
          <input
            id="inspection-date"
            type="date"
            required
            value={form.inspection_date}
            onChange={(e) => setForm({ ...form, inspection_date: e.target.value })}
          />
        </label>
        <label htmlFor="inspection-expiry">
          {t('driver.inspections.expiryDate')}
          <input
            id="inspection-expiry"
            type="date"
            required
            value={form.expiry_date}
            onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
          />
        </label>
        <label htmlFor="inspection-maintenance">
          {t('driver.inspections.maintenanceStatus')}
          <select
            id="inspection-maintenance"
            value={form.maintenance_status}
            onChange={(e) => setForm({ ...form, maintenance_status: e.target.value as MaintenanceStatus })}
          >
            <option value="ok">{t('driver.maintenance.ok')}</option>
            <option value="needs_service">{t('driver.maintenance.needs_service')}</option>
            <option value="out_of_service">{t('driver.maintenance.out_of_service')}</option>
          </select>
        </label>
        <label htmlFor="inspection-notes">
          {t('driver.inspections.notes')}
          <input id="inspection-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <label htmlFor="inspection-file">
          {t('driver.inspections.fileLabel')}
          <input id="inspection-file" type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <button className="btn primary" disabled={busy}>
          {t('driver.inspections.send')}
        </button>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('driver.inspections.inspection')}</th>
              <th>{t('driver.inspections.expiry')}</th>
              <th>{t('driver.inspections.maintenance')}</th>
              <th>{t('driver.inspections.file')}</th>
              <th>{t('driver.inspections.status')}</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((i) => (
              <tr key={i.id}>
                <td>{i.inspection_date}</td>
                <td>{i.expiry_date}</td>
                <td>{t(`driver.maintenance.${i.maintenance_status}`)}</td>
                <td>
                  {i.file_path ? (
                    <a href={fileUrl(`/api/driver/vehicle/inspections/${i.id}/file`)} target="_blank" rel="noreferrer">
                      {t('driver.inspections.viewFile')}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <span className={`chip ${i.approval_state === 'approved' ? 'confirmed' : i.approval_state === 'rejected' ? 'cancelled' : 'pending'}`}>
                    {t(`status.kyc.${i.approval_state}`)}
                  </span>
                  {i.approval_state === 'rejected' && i.rejection_reason && <div className="muted small">{i.rejection_reason}</div>}
                </td>
              </tr>
            ))}
            {inspections.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  {t('driver.inspections.none')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Mes évaluations (Task 6.3) ───────────────────────────────────────────────

function DriverRatingsTab() {
  const { t } = useI18n();
  const [rows, setRows] = useState<RatingRow[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<{ ratings: RatingRow[] }>('/api/driver/ratings')
      .then((r) => setRows(r.ratings))
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div>
      <p className="muted">{t('driver.ratings.intro')}</p>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('driver.ratings.reservation')}</th>
              <th>{t('driver.ratings.customer')}</th>
              <th>{t('driver.ratings.rating')}</th>
              <th>{t('driver.ratings.review')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.reservation_code}</td>
                <td>{r.rater_customer_name ?? '—'}</td>
                <td>{'★'.repeat(r.stars)}</td>
                <td className="muted small">{r.review ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  {t('driver.ratings.none')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Mes revenus (Task 8.2 earnings dashboard, 8.3 payout batches) ────────────

function EarningsTab() {
  const { t } = useI18n();
  const PAYOUT_ENTRY_LABEL: Record<PayoutLedgerRow['entry_type'], string> = {
    earning: t('driver.earnings.earningEntry'),
    refund_adjustment: t('driver.earnings.refundAdjustmentEntry'),
  };
  const [summary, setSummary] = useState<DriverEarningsSummary | null>(null);
  const [ledger, setLedger] = useState<PayoutLedgerRow[]>([]);
  const [batches, setBatches] = useState<PayoutBatchRow[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api<{ summary: DriverEarningsSummary }>('/api/driver/earnings'),
      api<{ ledger: PayoutLedgerRow[] }>('/api/driver/earnings/ledger'),
      api<{ batches: PayoutBatchRow[] }>('/api/driver/earnings/payouts'),
    ])
      .then(([s, l, b]) => {
        setSummary(s.summary);
        setLedger(l.ledger);
        setBatches(b.batches);
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, []);

  const card = (label: string, value: string | undefined, positive = true): JSX.Element => (
    <div className="card" style={{ minWidth: 160 }}>
      <p className="muted small" style={{ margin: 0 }}>
        {label}
      </p>
      <p className={positive ? 'positive' : 'negative'} style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
        {value === undefined ? '—' : `${Number(value).toLocaleString('fr-DZ')} DZD`}
      </p>
    </div>
  );

  return (
    <div>
      <p className="muted">{t('driver.earnings.intro')}</p>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {card(t('driver.earnings.grossRevenue'), summary?.gross_revenue)}
        {card(t('driver.earnings.commission'), summary?.commission, false)}
        {card(t('driver.earnings.refunds'), summary?.refunds, false)}
        {card(t('driver.earnings.netEarnings'), summary?.net_earnings)}
        {card(t('driver.earnings.pendingPayout'), summary?.pending_payout)}
        {card(t('driver.earnings.paidOut'), summary?.paid_out)}
      </div>

      <h3>{t('driver.earnings.batchesTitle')}</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('driver.earnings.period')}</th>
              <th>{t('driver.earnings.amount')}</th>
              <th>{t('driver.earnings.status')}</th>
              <th>{t('driver.earnings.reference')}</th>
              <th>{t('driver.earnings.paidAt')}</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td>
                  {fmtDateTime(b.period_start)} → {fmtDateTime(b.period_end)}
                </td>
                <td>{Number(b.total_amount).toLocaleString('fr-DZ')} DZD</td>
                <td>
                  <span className={`chip ${b.status}`}>{b.status}</span>
                </td>
                <td>{b.reference ?? '—'}</td>
                <td>{b.paid_at ? fmtDateTime(b.paid_at) : '—'}</td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  {t('driver.earnings.noBatches')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3>{t('driver.earnings.ledgerTitle')}</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('driver.earnings.type')}</th>
              <th>{t('driver.earnings.trip')}</th>
              <th>{t('driver.earnings.reservation')}</th>
              <th>{t('driver.earnings.gross')}</th>
              <th>{t('driver.earnings.commission')}</th>
              <th>{t('driver.earnings.net')}</th>
              <th>{t('driver.earnings.date')}</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((l) => (
              <tr key={l.id}>
                <td>{PAYOUT_ENTRY_LABEL[l.entry_type]}</td>
                <td>{l.trip_code ?? '—'}</td>
                <td>{l.reservation_code ?? '—'}</td>
                <td>{Number(l.gross_amount).toLocaleString('fr-DZ')} DZD</td>
                <td>
                  {Number(l.commission_amount).toLocaleString('fr-DZ')} DZD ({l.commission_pct}%)
                </td>
                <td className={Number(l.net_amount) < 0 ? 'negative' : 'positive'}>{Number(l.net_amount).toLocaleString('fr-DZ')} DZD</td>
                <td>{fmtDateTime(l.created_at)}</td>
              </tr>
            ))}
            {ledger.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  {t('driver.earnings.noLedger')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Mes documents (KYC — Task 6.1) ──────────────────────────────────────────

function KycTab() {
  const { t } = useI18n();
  const KYC_DOC_LABEL: Record<KycDocType, string> = {
    identity: t('status.kycDoc.identity'),
    license: t('status.kycDoc.license'),
    vehicle_registration: t('status.kycDoc.vehicle_registration'),
    insurance: t('status.kycDoc.insurance'),
  };
  const [docs, setDocs] = useState<KycDocumentRow[]>([]);
  const [msg, setMsg] = useState('');
  const [busyType, setBusyType] = useState<KycDocType | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ documents: KycDocumentRow[] }>('/api/driver/kyc');
      setDocs(r.documents);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const latestByType = useMemo(() => {
    const m = new Map<KycDocType, KycDocumentRow>();
    for (const d of docs) {
      const existing = m.get(d.doc_type);
      if (!existing || new Date(d.submitted_at) > new Date(existing.submitted_at)) m.set(d.doc_type, d);
    }
    return m;
  }, [docs]);

  const upload = async (docType: KycDocType, file: File | undefined): Promise<void> => {
    if (!file) return;
    setBusyType(docType);
    setMsg('');
    try {
      await apiUpload('/api/driver/kyc', file, { doc_type: docType });
      setMsg(t('driver.kyc.uploaded'));
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyType(null);
    }
  };

  const docTypes = Object.keys(KYC_DOC_LABEL) as KycDocType[];

  return (
    <div>
      <p className="muted">{t('driver.kyc.intro')}</p>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <div className="grid">
        {docTypes.map((docType) => {
          const current = latestByType.get(docType);
          return (
            <div key={docType} className="card">
              <h3 style={{ marginTop: 0 }}>{KYC_DOC_LABEL[docType]}</h3>
              {current ? (
                <>
                  <p>
                    <span className={`chip ${current.status}`}>{t(`status.kyc.${current.status}`)}</span>
                  </p>
                  <p className="muted small">
                    {t('driver.kyc.sentOn', { date: fmtDateTime(current.submitted_at) })}{' '}
                    <a href={fileUrl(`/api/driver/kyc/${current.id}/file`)} target="_blank" rel="noreferrer">
                      {t('driver.kyc.viewFile')}
                    </a>
                  </p>
                  {current.status === 'rejected' && current.rejection_reason && (
                    <p className="alert error" role="alert">
                      {t('driver.kyc.rejectionReason', { reason: current.rejection_reason })}
                    </p>
                  )}
                </>
              ) : (
                <p className="muted small">{t('driver.kyc.noneSent')}</p>
              )}
              <label className="btn ghost small" style={{ display: 'inline-block', cursor: 'pointer' }}>
                {busyType === docType ? t('driver.kyc.uploading') : current ? t('driver.kyc.uploadNewVersion') : t('driver.kyc.upload')}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  style={{ display: 'none' }}
                  disabled={busyType !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    void upload(docType, file);
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
