import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, api, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import TripMap, { type MapPin, type MapStop } from '../components/TripMap';
import type { TripDetail, Wilaya } from '../types';

type PickMode = 'pickup' | 'dropoff';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<TripDetail | null>(null);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [seats, setSeats] = useState(1);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const [showMap, setShowMap] = useState(false);
  const [pickMode, setPickMode] = useState<PickMode>('pickup');
  const [pickupPos, setPickupPos] = useState<{ lat: number; lon: number } | null>(null);
  const [dropoffPos, setDropoffPos] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([api<TripDetail>(`/api/trips/${id}`), api<{ wilayas: Wilaya[] }>('/api/registry/wilayas')])
      .then(([d, w]) => {
        setData(d);
        setWilayas(w.wilayas);
        setPickup(d.stops[0]?.id ?? '');
        setDropoff(d.stops[d.stops.length - 1]?.id ?? '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  // Picking different stops invalidates any exact pin placed for that side —
  // the pin must stay consistent with the chosen wilaya-level stop.
  useEffect(() => setPickupPos(null), [pickup]);
  useEffect(() => setDropoffPos(null), [dropoff]);

  const pricePair = useMemo(
    () => data?.prices.find((p) => p.from_wpoint_id === pickup && p.to_wpoint_id === dropoff) ?? null,
    [data, pickup, dropoff],
  );
  const total = pricePair ? Number(pricePair.price) * seats : null;
  const maxSeats = Math.min(30, data?.trip.seats_available ?? 30);

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

  const pickedMarkers: MapPin[] = useMemo(() => {
    const pins: MapPin[] = [];
    if (pickupPos) pins.push({ id: 'pickup', label: 'Montée (choisie)', lat: pickupPos.lat, lon: pickupPos.lon, color: '#16a34a' });
    if (dropoffPos) pins.push({ id: 'dropoff', label: 'Descente (choisie)', lat: dropoffPos.lat, lon: dropoffPos.lon, color: '#dc2626' });
    return pins;
  }, [pickupPos, dropoffPos]);

  const onMapPick = (lat: number, lon: number): void => {
    if (pickMode === 'pickup') setPickupPos({ lat, lon });
    else setDropoffPos({ lat, lon });
  };

  const book = async (): Promise<void> => {
    if (!user) {
      navigate(`/login?next=/trips/${id}`);
      return;
    }
    setError('');
    try {
      await api('/api/reservations', {
        method: 'POST',
        body: {
          trip_id: id,
          seats,
          pickup_wpoint_id: pickup,
          dropoff_wpoint_id: dropoff,
          pickup_lat: pickupPos?.lat ?? null,
          pickup_lon: pickupPos?.lon ?? null,
          dropoff_lat: dropoffPos?.lat ?? null,
          dropoff_lon: dropoffPos?.lon ?? null,
        },
      });
      setDone('✔ Réservation confirmée — retrouvez-la dans « Mes réservations »');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        navigate(`/login?next=/trips/${id}`);
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (error) return <p className="alert error">{error}</p>;
  if (!data) return <p className="empty">Chargement…</p>;
  const { trip, stops } = data;

  return (
    <section className="detail">
      <h1>
        {trip.trajectory_name} <span className="chip">{trip.code}</span>
      </h1>
      <p className="meta">
        🕒 Départ {fmtDateTime(trip.departure_at)} · Arrivée {fmtDateTime(trip.arrival_eta)} · 🧑‍✈️{' '}
        {trip.driver_name ?? '—'} · 🚐 {trip.vehicle_matricule ?? '—'}
      </p>

      <div className="detail-grid">
        <div className="card">
          <h2>Itinéraire</h2>
          <ol className="stops">
            {stops.map((s) => (
              <li key={s.id} className={s.id === pickup ? 'stop from' : s.id === dropoff ? 'stop to' : ''}>
                <span className="dot" />
                <div>
                  <strong>{s.nom_fr}</strong> <span className="muted">({s.nom_ar})</span>
                  <div className="muted">{fmtDateTime(s.eta)}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="card booking">
          <h2>Réserver</h2>
          <label>
            Montée
            <select value={pickup} onChange={(e) => setPickup(e.target.value)}>
              {stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom_fr}
                </option>
              ))}
            </select>
          </label>
          <label>
            Descente
            <select value={dropoff} onChange={(e) => setDropoff(e.target.value)}>
              {stops.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === pickup}>
                  {s.nom_fr}
                </option>
              ))}
            </select>
          </label>
          <label>
            Places
            <input
              type="number"
              min={1}
              max={maxSeats}
              value={seats}
              onChange={(e) => setSeats(Math.max(1, Math.min(maxSeats, Number(e.target.value) || 1)))}
            />
          </label>

          <button type="button" className="btn ghost small" style={{ marginBottom: 12 }} onClick={() => setShowMap((v) => !v)}>
            {showMap ? 'Masquer la carte' : '📍 Choisir ma position exacte sur la carte (optionnel)'}
          </button>

          {showMap && (
            <div style={{ marginBottom: 12 }}>
              <div className="form-inline" style={{ marginBottom: 8 }}>
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <input type="radio" name="pickmode" checked={pickMode === 'pickup'} onChange={() => setPickMode('pickup')} />
                  Placer le point de montée
                </label>
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <input type="radio" name="pickmode" checked={pickMode === 'dropoff'} onChange={() => setPickMode('dropoff')} />
                  Placer le point de descente
                </label>
              </div>
              <p className="muted small">
                Cliquez sur la carte pour indiquer précisément où le chauffeur doit vous prendre / déposer, dans la
                wilaya choisie ci-dessus. Facultatif — sans clic, le chauffeur verra une position approximative (centre
                de la wilaya).
              </p>
              <TripMap stops={mapStops} pickedMarkers={pickedMarkers} onPick={onMapPick} height={320} />
            </div>
          )}

          <div className="total">
            {pricePair ? (
              <>
                <span>
                  {Number(pricePair.price).toLocaleString('fr-DZ')} {pricePair.currency} × {seats}
                </span>
                <strong>
                  {total?.toLocaleString('fr-DZ')} {pricePair.currency}
                </strong>
              </>
            ) : (
              <span className="muted">Aucun tarif pour ce trajet — choisissez d'autres arrêts.</span>
            )}
          </div>
          {done ? (
            <p className="alert success">{done}</p>
          ) : (
            <button className="btn primary wide" disabled={!pricePair || maxSeats < 1} onClick={() => void book()}>
              {user ? 'Réserver' : 'Se connecter pour réserver'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
