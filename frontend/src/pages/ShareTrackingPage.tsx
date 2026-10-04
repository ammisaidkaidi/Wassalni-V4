import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError, fmtDateTime } from '../api';
import type { SharedTripInfo } from '../types';

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Planifié',
  boarding: 'Embarquement',
  in_progress: 'En route',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

/**
 * Task 11.4 — public, unauthenticated live-trip tracking page. Reachable via
 * the share link a customer/driver generates from their reservation
 * (`/track/:token`). Deliberately shows only status/ETA/position — no
 * names, phone numbers, or price (see get_shared_trip_info() in sql.txt).
 */
export default function ShareTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<SharedTripInfo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        const data = await res.json();
        if (!res.ok) throw new ApiError(data?.error?.message ?? 'Erreur', data?.error?.code ?? 'UNKNOWN', res.status);
        if (!stop) {
          setInfo(data as SharedTripInfo);
          setError('');
        }
      } catch (err) {
        if (!stop) setError(err instanceof Error ? err.message : String(err));
      }
    };
    void load();
    const t = setInterval(load, 15_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [token]);

  return (
    <section>
      <h1>Suivi du voyage</h1>
      {error && (
        <p className="alert" style={{ background: '#fee2e2', color: 'var(--danger)' }}>
          {error}
        </p>
      )}
      {!error && !info && <p className="empty">Chargement…</p>}
      {info && (
        <div className="card" style={{ maxWidth: 480 }}>
          <p>
            <span className="pill">{STATUS_LABEL[info.trip_status] ?? info.trip_status}</span>
          </p>
          <div className="meta">
            <span>Départ : {fmtDateTime(info.departure_at)}</span>
            {info.arrival_eta && <span>Arrivée estimée : {fmtDateTime(info.arrival_eta)}</span>}
            <span>Places réservées : {info.seats}</span>
            <span>Statut de la réservation : {info.reservation_status}</span>
          </div>
          {info.driver_location ? (
            <p className="meta">
              Dernière position connue : {info.driver_location.lat.toFixed(5)}, {info.driver_location.lon.toFixed(5)} ({fmtDateTime(info.driver_location.recorded_at)})
            </p>
          ) : (
            <p className="empty">Position du conducteur pas encore disponible.</p>
          )}
        </div>
      )}
    </section>
  );
}
