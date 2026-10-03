import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import TripMap, { type MapPin, type MapStop } from '../components/TripMap';
import WpointManager from '../components/WpointManager';
import type {
  DriverProfileRow,
  DriverReservationRow,
  DriverTripRow,
  PricePair,
  Stop,
  TrajectoryRow,
  TripManifestRow,
  VehicleRow,
  Wilaya,
  WpointRow,
} from '../types';

const RESERVATION_STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#16a34a',
  completed: '#2563eb',
  cancelled: '#9ca3af',
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programmé',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

type Tab = 'trips' | 'current' | 'reservations' | 'trajectories' | 'settings';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'trips', label: 'Mes voyages' },
  { id: 'current', label: 'Trajet en cours' },
  { id: 'reservations', label: 'Réservations' },
  { id: 'trajectories', label: 'Trajectoires' },
  { id: 'settings', label: 'Paramètres' },
];

export default function DriverPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('trips');

  if (loading) return <p className="empty">Chargement…</p>;
  if (!user)
    return (
      <p className="empty">
        <Link to="/login?next=/driver">Connectez-vous</Link> avec votre compte chauffeur pour accéder à cette section.
      </p>
    );
  if (user.role !== 'driver') return <p className="empty">Cette section est réservée aux comptes chauffeur.</p>;

  return (
    <section>
      <h1>Espace chauffeur</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'trips' && <MesVoyagesTab />}
      {tab === 'current' && <TrajetEnCoursTab />}
      {tab === 'reservations' && <ReservationsTab />}
      {tab === 'trajectories' && <TrajectoiresTab />}
      {tab === 'settings' && <ParametresTab />}
    </section>
  );
}

// ── Mes voyages ──────────────────────────────────────────────────────────────

function MesVoyagesTab() {
  const [trips, setTrips] = useState<DriverTripRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const t = await api<{ trips: DriverTripRow[] }>('/api/driver/trips');
      setTrips(t.trips);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = trips.filter((t) => t.status === 'in_progress');
  const upcoming = trips.filter((t) => t.status === 'scheduled');
  const history = trips.filter((t) => t.status === 'completed' || t.status === 'cancelled');
  const selected = trips.find((t) => t.id === selectedId) ?? null;

  return (
    <div>
      {msg && <p className="alert error">{msg}</p>}
      {selected ? (
        <DriverTripDetail
          trip={selected}
          onBack={() => setSelectedId(null)}
          onChanged={() => {
            void load();
          }}
        />
      ) : trips.length === 0 ? (
        <p className="empty">Aucun voyage ne vous est assigné pour le moment.</p>
      ) : (
        <>
          <TripGroup title="En cours" trips={active} onOpen={setSelectedId} />
          <TripGroup title="À venir" trips={upcoming} onOpen={setSelectedId} />
          <TripGroup title="Historique" trips={history} onOpen={setSelectedId} />
        </>
      )}
    </div>
  );
}

function TripGroup({ title, trips, onOpen }: { title: string; trips: DriverTripRow[]; onOpen: (id: string) => void }) {
  if (trips.length === 0) return null;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Trajectoire</th>
              <th>Départ</th>
              <th>Véhicule</th>
              <th>Statut</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id}>
                <td>{t.code}</td>
                <td>{t.trajectory_name}</td>
                <td>{fmtDateTime(t.departure_at)}</td>
                <td>{t.vehicle_matricule ?? '—'}</td>
                <td>{STATUS_LABEL[t.status] ?? t.status}</td>
                <td>
                  <button className="btn ghost small" onClick={() => onOpen(t.id)}>
                    Ouvrir
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
      setMsg("La géolocalisation n'est pas supportée par ce navigateur.");
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
      (err) => setMsg(`Erreur de géolocalisation : ${err.message}`),
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
    if (!confirm('Annuler ce voyage ?')) return;
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
        ← Retour
      </button>
      <h2 style={{ marginTop: 0 }}>
        {trip.code} — {trip.trajectory_name}
      </h2>
      <p className="muted">
        Départ {fmtDateTime(trip.departure_at)} · {trip.capacity} places · {trip.vehicle_matricule ?? 'véhicule non assigné'} ·
        statut : <strong>{STATUS_LABEL[status] ?? status}</strong>
      </p>

      {msg && <p className="alert error">{msg}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {status === 'scheduled' && (
          <>
            <button className="btn primary" disabled={busy} onClick={() => void start()}>
              Démarrer le voyage
            </button>
            <button className="btn danger" disabled={busy} onClick={() => void cancel()}>
              Annuler le voyage
            </button>
          </>
        )}
        {status === 'in_progress' && (
          <>
            <button className={`btn ${sharing ? 'danger' : 'primary'}`} onClick={toggleSharing}>
              {sharing ? 'Arrêter le partage de position' : 'Partager ma position (GPS)'}
            </button>
            <button className="btn ghost" disabled={busy} onClick={() => void complete()}>
              Terminer le voyage
            </button>
          </>
        )}
      </div>
      {sharing && <p className="muted">📡 Position partagée en direct{lastSent ? ` — dernier envoi : ${lastSent}` : '…'}</p>}

      {data && (
        <>
          <h3>Arrêts</h3>
          <ol>
            {data.stops.map((s) => (
              <li key={s.id}>
                {s.nom_fr}
                {s.eta ? ` — ETA ${fmtDateTime(s.eta)}` : ''}
              </li>
            ))}
          </ol>

          <h3>Passagers ({data.manifest.reduce((n, m) => n + m.seats, 0)} place(s) réservée(s))</h3>
          {data.manifest.length === 0 ? (
            <p className="muted">Aucune réservation pour ce voyage.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Téléphone</th>
                    <th>Places</th>
                    <th>Montée</th>
                    <th>Descente</th>
                    <th>Statut</th>
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
                      <td>{m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Trajet en cours ──────────────────────────────────────────────────────────

interface CurrentTripDetailData {
  trip: DriverTripRow;
  stops: Stop[];
  manifest: TripManifestRow[];
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
  const [trip, setTrip] = useState<DriverTripRow | null>(null);
  const [data, setData] = useState<CurrentTripDetailData | null>(null);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [msg, setMsg] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, w] = await Promise.all([
        api<{ trips: DriverTripRow[] }>('/api/driver/trips'),
        api<{ wilayas: Wilaya[] }>('/api/registry/wilayas'),
      ]);
      setWilayas(w.wilayas);
      const current = pickCurrentTrip(t.trips);
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

  if (!loaded) return <p className="empty">Chargement…</p>;
  if (msg) return <p className="alert error">{msg}</p>;
  if (!trip) return <p className="empty">Aucun voyage en cours ni programmé pour le moment.</p>;

  const seatsReserved = data?.manifest.reduce((n, m) => n + m.seats, 0) ?? 0;

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>
          {trip.code} — {trip.trajectory_name}{' '}
          <span className={`chip ${trip.status}`}>{STATUS_LABEL[trip.status] ?? trip.status}</span>
        </h2>
        <p className="muted">
          Départ {fmtDateTime(trip.departure_at)} · {trip.capacity} places · {trip.vehicle_matricule ?? 'véhicule non assigné'} ·{' '}
          {seatsReserved} place(s) réservée(s)
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Carte du trajet</h2>
        <p className="muted small">
          Ligne bleue : trajectoire. Points colorés : position des clients —{' '}
          <span style={{ color: RESERVATION_STATUS_COLOR.pending }}>● en attente</span>{' '}
          <span style={{ color: RESERVATION_STATUS_COLOR.confirmed }}>● confirmée</span>{' '}
          <span style={{ color: RESERVATION_STATUS_COLOR.completed }}>● terminée</span>. Une position « (approx.) » est
          centrée sur la wilaya de montée faute de point précis fourni par le client.
        </p>
        {mapStops.length === 0 ? (
          <p className="empty">Coordonnées indisponibles pour cette trajectoire.</p>
        ) : (
          <TripMap stops={mapStops} pins={mapPins} height={420} />
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Réservations ({data?.manifest.length ?? 0})</h2>
        {!data || data.manifest.length === 0 ? (
          <p className="empty">Aucune réservation pour ce voyage.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Téléphone</th>
                  <th>Places</th>
                  <th>Montée</th>
                  <th>Descente</th>
                  <th>Position</th>
                  <th>Statut</th>
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
                    <td>{m.pickup_lat != null ? 'Précise (carte)' : 'Approximative (wilaya)'}</td>
                    <td>
                      <span className={`chip ${m.status}`}>{m.status}</span>
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
      setMsg(action === 'confirm' ? '✔ Réservation confirmée' : '✔ Réservation refusée');
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
        <label>
          Filtrer
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmées</option>
            <option value="cancelled">Refusées / annulées</option>
            <option value="">Toutes</option>
          </select>
        </label>
      </div>
      {msg && <p className="alert info">{msg}</p>}
      {rows.length === 0 ? (
        <p className="empty">Aucune réservation ici.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Voyage</th>
                <th>Départ</th>
                <th>Client</th>
                <th>Téléphone</th>
                <th>Places</th>
                <th>Montée → Descente</th>
                <th>Prix</th>
                <th>Statut</th>
                <th>Actions</th>
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
                    <span className={`chip ${r.status}`}>{r.status}</span>
                  </td>
                  <td className="actions">
                    {r.status === 'pending' && (
                      <>
                        <button className="btn primary small" disabled={busyId === r.id} onClick={() => void act(r.id, 'confirm')}>
                          Confirmer
                        </button>
                        <button className="btn danger small" disabled={busyId === r.id} onClick={() => void act(r.id, 'decline')}>
                          Refuser
                        </button>
                      </>
                    )}
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

// ── Trajectoires ─────────────────────────────────────────────────────────────

function TrajectoiresTab() {
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
    const [t, w] = await Promise.all([
      api<{ trajectories: TrajectoryRow[] }>('/api/driver/trajectories'),
      api<{ wilayas: Wilaya[] }>('/api/registry/wilayas'),
    ]);
    setRows(t.trajectories);
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
      setMsg('✔ Trajectoire créée');
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
      setMsg('✔ Tarif par défaut enregistré');
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
      setMsg('✔ Voyage créé (brouillon). Ajoutez les arrêts/prix puis publiez-le depuis « Mes voyages ».');
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
      setMsg('✔ Voyage publié — consultez-le dans « Mes voyages »');
      setLastTripId(null);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && <p className="alert info">{msg}</p>}
      <form className="card form-inline" onSubmit={(e) => void create(e)}>
        <label>
          Nouvelle trajectoire
          <input required minLength={2} placeholder="Alger — Blida" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn primary">Créer</button>
      </form>

      <div className="form-inline select-row">
        <label>
          Gérer
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">— Choisir une trajectoire —</option>
            {rows.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.nb_wpoints} arrêts)
              </option>
            ))}
          </select>
        </label>
      </div>

      {selected && (
        <div className="detail-grid">
          <div className="card">
            <h2>Arrêts</h2>
            <WpointManager basePath="/api/driver" trajectoryId={selected} wilayas={wilayas} onWpointsChange={setWpoints} />
          </div>

          <div className="card">
            <h2>Tarif par défaut</h2>
            <form className="form-grid" onSubmit={(e) => void setDefaultPrice(e)}>
              <label>
                De
                <select required value={price.from} onChange={(e) => setPrice({ ...price, from: e.target.value })}>
                  <option value="">—</option>
                  {wpoints.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nom_fr}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                À
                <select required value={price.to} onChange={(e) => setPrice({ ...price, to: e.target.value })}>
                  <option value="">—</option>
                  {wpoints.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nom_fr}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Prix (DZD)
                <input type="number" min={0} required value={price.amount} onChange={(e) => setPrice({ ...price, amount: e.target.value })} />
              </label>
              <button className="btn primary">Enregistrer</button>
            </form>
          </div>

          <div className="card">
            <h2>Créer un voyage sur cette trajectoire</h2>
            <form className="form-grid" onSubmit={(e) => void createTrip(e)}>
              <label>
                Départ
                <input
                  type="datetime-local"
                  required
                  value={tripForm.departure_at}
                  onChange={(e) => setTripForm({ ...tripForm, departure_at: e.target.value })}
                />
              </label>
              <label>
                Capacité
                <input
                  type="number"
                  min={1}
                  required
                  value={tripForm.capacity}
                  onChange={(e) => setTripForm({ ...tripForm, capacity: e.target.value })}
                />
              </label>
              <label>
                Prix/place (secours)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={tripForm.seat_price}
                  onChange={(e) => setTripForm({ ...tripForm, seat_price: e.target.value })}
                />
              </label>
              <button className="btn primary">Créer le voyage</button>
            </form>
            {lastTripId && (
              <p className="muted" style={{ marginTop: 12 }}>
                Voyage créé.{' '}
                <button className="btn ghost small" onClick={() => void populateAndPublish()}>
                  Ajouter les arrêts + tarifs par défaut et publier maintenant
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
  const [profile, setProfile] = useState<DriverProfileRow | null>(null);
  const [vehicle, setVehicle] = useState<VehicleRow | null>(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', email: '', address: '' });
  const [vehicleForm, setVehicleForm] = useState({ matricule: '', seats: '4', make: '', model: '' });
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
      setMsg('✔ Profil mis à jour');
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
      };
      if (vehicle) {
        await api('/api/driver/vehicle', { method: 'PATCH', body });
        setMsg('✔ Véhicule mis à jour');
      } else {
        await api('/api/driver/vehicle', { method: 'POST', body });
        setMsg('✔ Véhicule enregistré');
      }
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  if (!profile) return msg ? <p className="alert error">{msg}</p> : <p className="empty">Chargement…</p>;

  return (
    <div className="detail-grid">
      {msg && <p className="alert info" style={{ gridColumn: '1 / -1' }}>{msg}</p>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Mon profil</h2>
        <p className="muted small">
          Identité officielle (NIN {profile.nin}) non modifiable ici — contactez l'administrateur pour toute correction.
        </p>
        <form className="form-grid" onSubmit={(e) => void saveProfile(e)}>
          <label>
            Nom complet
            <input
              required
              minLength={2}
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
            />
          </label>
          <label>
            Téléphone
            <input required value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
          </label>
          <label>
            Email
            <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
          </label>
          <label>
            Adresse
            <input value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
          </label>
          <button className="btn primary">Enregistrer</button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Mon véhicule</h2>
        {!vehicle && <p className="muted small">Vous n'avez pas encore de véhicule enregistré — créez-le ci-dessous.</p>}
        <form className="form-grid" onSubmit={(e) => void saveVehicle(e)}>
          <label>
            Matricule
            <input
              required
              minLength={3}
              value={vehicleForm.matricule}
              onChange={(e) => setVehicleForm({ ...vehicleForm, matricule: e.target.value })}
            />
          </label>
          <label>
            Places
            <input
              type="number"
              min={1}
              required
              value={vehicleForm.seats}
              onChange={(e) => setVehicleForm({ ...vehicleForm, seats: e.target.value })}
            />
          </label>
          <label>
            Marque
            <input value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })} />
          </label>
          <label>
            Modèle
            <input value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} />
          </label>
          <button className="btn primary">{vehicle ? 'Mettre à jour' : 'Enregistrer'}</button>
        </form>
      </div>
    </div>
  );
}
