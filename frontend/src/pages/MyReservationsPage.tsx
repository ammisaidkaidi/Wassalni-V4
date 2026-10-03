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

  const remove = async (id: string): Promise<void> => {
    setMsg('');
    setError('');
    if (!window.confirm('Supprimer définitivement cette réservation ? Cette action est irréversible.')) return;
    try {
      await api(`/api/reservations/${id}`, { method: 'DELETE' });
      setMsg('✔ Réservation supprimée');
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

  const paymentLabel: Record<ReservationRow['payment_status'], string> = {
    unpaid: 'Non payé',
    partially_paid: 'Partiellement payé',
    paid: 'Payé',
    cancelled: 'Annulé',
  };

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
            <div className="meta">
              <span className={`chip ${r.payment_status}`}>💳 {paymentLabel[r.payment_status]}</span>
              {Number(r.amount_paid) > 0 && (
                <span>✔ Payé : {Number(r.amount_paid).toLocaleString('fr-DZ')} {r.currency}</span>
              )}
              {r.status !== 'cancelled' && Number(r.balance_due) > 0 && (
                <span>⏳ Reste à payer : {Number(r.balance_due).toLocaleString('fr-DZ')} {r.currency}</span>
              )}
              {r.refund_status !== 'none' && (
                <span>
                  ↩ Remboursé {r.refund_status === 'full' ? 'intégralement' : 'partiellement'} :{' '}
                  {Number(r.refunded_amount).toLocaleString('fr-DZ')} {r.currency}
                </span>
              )}
            </div>
            <div className="foot">
              <span className={`chip ${r.status}`}>{r.status}</span>
              {(r.status === 'pending' || r.status === 'confirmed') && (
                <button className="btn danger small" onClick={() => void cancel(r.id)}>
                  Annuler
                </button>
              )}
              {r.status === 'cancelled' && (
                <button className="btn danger small" onClick={() => void remove(r.id)}>
                  Supprimer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
