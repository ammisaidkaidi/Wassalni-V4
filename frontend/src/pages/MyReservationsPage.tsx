import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, fileUrl, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import type { PaymentRow, ReservationEtaResult, ReservationRow, RatingStatus } from '../types';

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cib: 'Carte CIB',
  edahabia: 'Carte Edahabia',
  card: 'Carte bancaire',
  bank_transfer: 'Virement bancaire',
};

/**
 * Task 7.1/7.2 — "Payer en ligne". Opens the mock gateway's hosted checkout
 * page in a new tab (it's a plain unauthenticated page served by the
 * backend) and polls OUR server for the payment's actual status — the tab
 * itself is never trusted, only `GET /:id/payments` is, since the webhook
 * that marks a payment paid is asynchronous and server-to-server.
 */
function PayOnlineAction({ reservationId, onSettled }: { reservationId: string; onSettled: () => void }) {
  const [method, setMethod] = useState('cib');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const pollRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
  }, []);

  const pay = async (): Promise<void> => {
    setBusy(true);
    setMsg('');
    try {
      const r = await api<{ checkout_url: string }>(`/api/reservations/${reservationId}/checkout`, { method: 'POST', body: { method } });
      window.open(r.checkout_url, '_blank', 'noopener');
      setMsg('Fenêtre de paiement ouverte — en attente de la confirmation de la banque…');
      let attempts = 0;
      pollRef.current = window.setInterval(async () => {
        attempts += 1;
        try {
          const p = await api<{ payments: PaymentRow[] }>(`/api/reservations/${reservationId}/payments`);
          const settled = p.payments.find((pay) => pay.status === 'paid' || pay.status === 'failed');
          if (settled) {
            if (pollRef.current) window.clearInterval(pollRef.current);
            setBusy(false);
            setMsg(settled.status === 'paid' ? '✔ Paiement confirmé' : `❌ Paiement échoué${settled.failure_reason ? ` — ${settled.failure_reason}` : ''}`);
            onSettled();
          }
        } catch {
          // transient — keep polling until the timeout below
        }
        if (attempts >= 40 && pollRef.current) {
          window.clearInterval(pollRef.current);
          setBusy(false);
          setMsg('Toujours en attente — vérifiez le statut plus tard, le paiement sera mis à jour automatiquement.');
        }
      }, 3000);
    } catch (err) {
      setBusy(false);
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <select value={method} onChange={(e) => setMethod(e.target.value)} disabled={busy}>
        {Object.entries(PAYMENT_METHOD_LABEL).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <button className="btn primary small" disabled={busy} onClick={() => void pay()}>
        Payer en ligne
      </button>
      {msg && <span className="muted small">{msg}</span>}
    </span>
  );
}

/** Task 9.3 — pay the still-open balance straight from the customer's wallet, no gateway round-trip. */
function PayWithWalletAction({ reservationId, onSettled }: { reservationId: string; onSettled: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const pay = async (): Promise<void> => {
    setBusy(true);
    setMsg('');
    try {
      await api(`/api/reservations/${reservationId}/pay-wallet`, { method: 'POST', body: {} });
      setMsg('✔ Payé avec le portefeuille');
      onSettled();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <button className="btn ghost small" disabled={busy} onClick={() => void pay()}>
        💼 Payer avec le portefeuille
      </button>
      {msg && <span className="muted small">{msg}</span>}
    </span>
  );
}

/** Task 9.2 — redeem a promo code against this reservation's total; the discount is credited to the wallet. */
function PromoCodeAction({ reservationId, onSettled }: { reservationId: string; onSettled: () => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setMsg('');
    try {
      await api('/api/customer/promo-codes/redeem', { method: 'POST', body: { code: code.trim(), reservation_id: reservationId } });
      setMsg('✔ Code appliqué — crédité sur votre portefeuille');
      setCode('');
      setOpen(false);
      onSettled();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <span>
        <button className="btn ghost small" onClick={() => setOpen(true)}>
          🏷️ Code promo
        </button>
        {msg && <span className="muted small"> {msg}</span>}
      </span>
    );

  return (
    <form className="form-inline" onSubmit={(e) => void submit(e)}>
      {msg && <span className="alert error small">{msg}</span>}
      <input placeholder="CODE" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
      <button className="btn primary small" disabled={busy}>
        Appliquer
      </button>
      <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>
        Annuler
      </button>
    </form>
  );
}

/** Task 6.3 — customer rates the driver once the reservation is completed. */
function RateDriverAction({ reservationId }: { reservationId: string }) {
  const [status, setStatus] = useState<RatingStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ rating_status: RatingStatus }>(`/api/reservations/${reservationId}/rating-status`)
      .then((r) => setStatus(r.rating_status))
      .catch(() => setStatus(null));
  }, [reservationId]);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await api(`/api/reservations/${reservationId}/rate-driver`, { method: 'POST', body: { stars, review: review || undefined } });
      setStatus({ driver_to_customer: status?.driver_to_customer ?? false, customer_to_driver: true });
      setOpen(false);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (status?.customer_to_driver) return <span className="chip confirmed">✔ chauffeur noté</span>;

  return (
    <span>
      <button className="btn ghost small" onClick={() => setOpen(!open)}>
        Noter le chauffeur
      </button>
      {open && (
        <form className="form-inline" style={{ marginTop: 6 }} onSubmit={(e) => void submit(e)}>
          {msg && <span className="alert error small">{msg}</span>}
          <select value={stars} onChange={(e) => setStars(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)}
              </option>
            ))}
          </select>
          <input placeholder="Avis (optionnel)" value={review} onChange={(e) => setReview(e.target.value)} />
          <button className="btn primary small" disabled={busy}>
            Envoyer
          </button>
        </form>
      )}
    </span>
  );
}

const ETA_REASON_LABEL: Record<string, string> = {
  not_in_progress: "Le voyage n'a pas encore démarré",
  no_location: 'Position du chauffeur pas encore reçue',
  stale_location: 'Dernière position connue trop ancienne',
  no_reference_coordinates: 'Estimation indisponible pour cette destination',
};

/** Task 4.3 — live ETA to this reservation's own dropoff, shown only once the trip is actually under way. */
function LiveEta({ reservationId }: { reservationId: string }) {
  const [eta, setEta] = useState<ReservationEtaResult | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      setEta(await api<ReservationEtaResult>(`/api/reservations/${reservationId}/eta`));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [reservationId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (err) return null;
  const stop = eta?.stop;

  return (
    <div className="meta">
      {stop?.eta ? (
        <span>
          🚐 Arrivée estimée : {fmtDateTime(stop.eta)} ({stop.distance_km} km)
        </span>
      ) : (
        <span className="muted small">🚐 {stop?.reason ? ETA_REASON_LABEL[stop.reason] : 'ETA indisponible'}</span>
      )}
      <button className="btn ghost small" onClick={() => void load()}>
        Actualiser
      </button>
    </div>
  );
}

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
              {r.status !== 'cancelled' && Number(r.balance_due) > 0 && <PayOnlineAction reservationId={r.id} onSettled={() => void load()} />}
              {r.status !== 'cancelled' && Number(r.balance_due) > 0 && (
                <PayWithWalletAction reservationId={r.id} onSettled={() => void load()} />
              )}
              {r.status !== 'cancelled' && Number(r.balance_due) > 0 && <PromoCodeAction reservationId={r.id} onSettled={() => void load()} />}
              {Number(r.amount_paid) > 0 && (
                <a className="btn ghost small" href={fileUrl(`/api/reservations/${r.id}/receipt.pdf`)} target="_blank" rel="noreferrer">
                  📄 Reçu PDF
                </a>
              )}
              {r.refund_status !== 'none' && (
                <span>
                  ↩ Remboursé {r.refund_status === 'full' ? 'intégralement' : 'partiellement'} :{' '}
                  {Number(r.refunded_amount).toLocaleString('fr-DZ')} {r.currency}
                </span>
              )}
            </div>
            {r.trip_status === 'in_progress' && r.status === 'confirmed' && <LiveEta reservationId={r.id} />}
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
              {r.status === 'completed' && <RateDriverAction reservationId={r.id} />}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
