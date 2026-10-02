import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import type { ReservationRow } from '../types';

export default function MyReservationsPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<ReservationRow[] | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api<{ reservations: ReservationRow[] }>('/api/reservations/me');
      setRows(r.reservations);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setError('Connectez-vous pour voir vos réservations.');
      else setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (!loading && user) void load();
  }, [loading, user, load]);

  const cancel = async (id: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/reservations/${id}/cancel`, { method: 'POST', body: {} });
      setMsg('✔ Réservation annulée');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) return <p className="empty">Chargement…</p>;
  if (!user)
    return (
      <p className="empty">
        <Link to="/login?next=/reservations">Connectez-vous</Link> pour voir vos réservations.
      </p>
    );

  return (
    <section>
      <h1>Mes réservations</h1>
      {error && <p className="alert error">{error}</p>}
      {msg && <p className="alert success">{msg}</p>}
      {rows !== null && rows.length === 0 && <p className="empty">Aucune réservation pour le moment.</p>}
      <div className="grid">
        {(rows ?? []).map((r) => (
          <div key={r.id} className="card res-card">
            <div className="route">
              <strong>{r.trajectory_name}</strong>
            </div>
            <div className="meta">
              <span>🧾 {r.code}</span>
              <span>🕒 {fmtDateTime(r.departure_at)}</span>
              <span>
                👥 {r.seats} place(s) — {Number(r.total_price).toLocaleString('fr-DZ')} {r.currency}
              </span>
            </div>
            <div className="foot">
              <span className={`chip ${r.status}`}>{r.status}</span>
              {(r.status === 'pending' || r.status === 'confirmed') && (
                <button className="btn danger small" onClick={() => void cancel(r.id)}>
                  Annuler
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
