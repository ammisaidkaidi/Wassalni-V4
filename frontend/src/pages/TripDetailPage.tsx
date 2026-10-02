import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, api, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import type { TripDetail } from '../types';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<TripDetail | null>(null);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [seats, setSeats] = useState(1);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    if (!id) return;
    api<TripDetail>(`/api/trips/${id}`)
      .then((d) => {
        setData(d);
        setPickup(d.stops[0]?.id ?? '');
        setDropoff(d.stops[d.stops.length - 1]?.id ?? '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  const pricePair = useMemo(
    () => data?.prices.find((p) => p.from_wpoint_id === pickup && p.to_wpoint_id === dropoff) ?? null,
    [data, pickup, dropoff],
  );
  const total = pricePair ? Number(pricePair.price) * seats : null;
  const maxSeats = Math.min(30, data?.trip.seats_available ?? 30);

  const book = async (): Promise<void> => {
    setError('');
    try {
      await api('/api/reservations', {
        method: 'POST',
        body: { trip_id: id, seats, pickup_wpoint_id: pickup, dropoff_wpoint_id: dropoff },
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
