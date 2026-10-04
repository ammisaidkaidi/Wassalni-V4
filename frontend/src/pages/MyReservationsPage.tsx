import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, fileUrl, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import {
  ConversationAction,
  PassengersAction,
  RequirementsAction,
  RevealContactAction,
  ShareLinkAction,
} from '../components/ReservationExtras';
import { useI18n } from '../i18n';
import type { PaymentRow, RatingStatus, ReservationEtaResult, ReservationRow } from '../types';

/**
 * Task 7.1/7.2 — "Payer en ligne". Opens the mock gateway's hosted checkout
 * page in a new tab (it's a plain unauthenticated page served by the
 * backend) and polls OUR server for the payment's actual status — the tab
 * itself is never trusted, only `GET /:id/payments` is, since the webhook
 * that marks a payment paid is asynchronous and server-to-server.
 */
function PayOnlineAction({ reservationId, onSettled }: { reservationId: string; onSettled: () => void }) {
  const { t } = useI18n();
  const paymentMethodLabel: Record<string, string> = {
    cib: t('paymentMethod.cib'),
    edahabia: t('paymentMethod.edahabia'),
    card: t('paymentMethod.card'),
    bank_transfer: t('paymentMethod.bank_transfer'),
  };
  const [method, setMethod] = useState('cib');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const pollRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    },
    [],
  );

  const pay = async (): Promise<void> => {
    setBusy(true);
    setMsg('');
    try {
      const r = await api<{ checkout_url: string }>(`/api/reservations/${reservationId}/checkout`, {
        method: 'POST',
        body: { method },
      });
      window.open(r.checkout_url, '_blank', 'noopener');
      setMsg(t('reservations.payOnlineOpened'));
      let attempts = 0;
      pollRef.current = window.setInterval(async () => {
        attempts += 1;
        try {
          const p = await api<{ payments: PaymentRow[] }>(`/api/reservations/${reservationId}/payments`);
          const settled = p.payments.find((pay) => pay.status === 'paid' || pay.status === 'failed');
          if (settled) {
            if (pollRef.current) window.clearInterval(pollRef.current);
            setBusy(false);
            setMsg(
              settled.status === 'paid'
                ? t('reservations.paymentConfirmed')
                : t('reservations.paymentFailed', { reason: settled.failure_reason ? ` — ${settled.failure_reason}` : '' }),
            );
            onSettled();
          }
        } catch {
          // transient — keep polling until the timeout below
        }
        if (attempts >= 40 && pollRef.current) {
          window.clearInterval(pollRef.current);
          setBusy(false);
          setMsg(t('reservations.paymentStillPending'));
        }
      }, 3000);
    } catch (err) {
      setBusy(false);
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        disabled={busy}
        aria-label={t('reservations.payOnline')}
      >
        {Object.entries(paymentMethodLabel).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <button className="btn primary small" disabled={busy} onClick={() => void pay()}>
        {t('reservations.payOnline')}
      </button>
      {msg && (
        <span className="muted small" role="status">
          {msg}
        </span>
      )}
    </span>
  );
}

/** Task 9.3 — pay the still-open balance straight from the customer's wallet, no gateway round-trip. */
function PayWithWalletAction({ reservationId, onSettled }: { reservationId: string; onSettled: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const pay = async (): Promise<void> => {
    setBusy(true);
    setMsg('');
    try {
      await api(`/api/reservations/${reservationId}/pay-wallet`, { method: 'POST', body: {} });
      setMsg(t('reservations.paidWithWallet'));
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
        {t('reservations.payWithWallet')}
      </button>
      {msg && (
        <span className="muted small" role="status">
          {msg}
        </span>
      )}
    </span>
  );
}

/** Task 9.2 — redeem a promo code against this reservation's total; the discount is credited to the wallet. */
function PromoCodeAction({ reservationId, onSettled }: { reservationId: string; onSettled: () => void }) {
  const { t } = useI18n();
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
      await api('/api/customer/promo-codes/redeem', {
        method: 'POST',
        body: { code: code.trim(), reservation_id: reservationId },
      });
      setMsg(t('reservations.promoApplied'));
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
          {t('reservations.promoCode')}
        </button>
        {msg && (
          <span className="muted small" role="status">
            {' '}
            {msg}
          </span>
        )}
      </span>
    );

  return (
    <form className="form-inline" onSubmit={(e) => void submit(e)}>
      {msg && (
        <span className="alert error small" role="alert">
          {msg}
        </span>
      )}
      <label className="sr-only" htmlFor="promo-code-input">
        {t('reservations.promoCode')}
      </label>
      <input
        id="promo-code-input"
        placeholder={t('reservations.promoPlaceholder')}
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
      />
      <button className="btn primary small" disabled={busy}>
        {t('reservations.apply')}
      </button>
      <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>
        {t('common.cancel')}
      </button>
    </form>
  );
}

/** Task 6.3 — customer rates the driver once the reservation is completed. */
function RateDriverAction({ reservationId }: { reservationId: string }) {
  const { t } = useI18n();
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
      await api(`/api/reservations/${reservationId}/rate-driver`, {
        method: 'POST',
        body: { stars, review: review || undefined },
      });
      setStatus({ driver_to_customer: status?.driver_to_customer ?? false, customer_to_driver: true });
      setOpen(false);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (status?.customer_to_driver) return <span className="chip confirmed">{t('reservations.driverRated')}</span>;

  return (
    <span>
      <button className="btn ghost small" onClick={() => setOpen(!open)}>
        {t('reservations.rateDriver')}
      </button>
      {open && (
        <form className="form-inline" style={{ marginTop: 6 }} onSubmit={(e) => void submit(e)}>
          {msg && (
            <span className="alert error small" role="alert">
              {msg}
            </span>
          )}
          <label className="sr-only" htmlFor="rate-driver-stars">
            {t('reservations.rateDriver')}
          </label>
          <select id="rate-driver-stars" value={stars} onChange={(e) => setStars(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="rate-driver-review">
            {t('reservations.reviewPlaceholder')}
          </label>
          <input
            id="rate-driver-review"
            placeholder={t('reservations.reviewPlaceholder')}
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
          <button className="btn primary small" disabled={busy}>
            {t('reservations.send')}
          </button>
        </form>
      )}
    </span>
  );
}

/** Task 4.3 — live ETA to this reservation's own dropoff, shown only once the trip is actually under way. */
function LiveEta({ reservationId }: { reservationId: string }) {
  const { t } = useI18n();
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
  const reasonLabel = (key: string) => {
    const translated = t(`etaReason.${key}`);
    return translated === `etaReason.${key}` ? key : translated;
  };

  return (
    <div className="meta">
      {stop?.eta ? (
        <span>{t('reservations.liveEtaArrival', { date: fmtDateTime(stop.eta), distance: stop.distance_km ?? '—' })}</span>
      ) : (
        <span className="muted small">
          {t('reservations.liveEtaUnavailable', {
            reason: stop?.reason ? reasonLabel(stop.reason) : t('reservations.etaGenericUnavailable'),
          })}
        </span>
      )}
      <button className="btn ghost small" onClick={() => void load()}>
        {t('reservations.refresh')}
      </button>
    </div>
  );
}

export default function MyReservationsPage() {
  const { t, lang } = useI18n();
  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-DZ';
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<ReservationRow[] | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api<{ reservations: ReservationRow[] }>('/api/reservations/me');
      setRows(r.reservations);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setError(t('reservations.loginToView'));
      else setError(e instanceof Error ? e.message : String(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && user) void load();
  }, [loading, user, load]);

  const cancel = async (id: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/reservations/${id}/cancel`, { method: 'POST', body: {} });
      setMsg(t('reservations.cancelled'));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (id: string): Promise<void> => {
    setMsg('');
    setError('');
    if (!window.confirm(t('reservations.confirmRemove'))) return;
    try {
      await api(`/api/reservations/${id}`, { method: 'DELETE' });
      setMsg(t('reservations.removed'));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) return <p className="empty">{t('reservations.loading')}</p>;
  if (!user)
    return (
      <p className="empty">
        <Link to="/login?next=/reservations">{t('login.title')}</Link> — {t('reservations.loginToView')}
      </p>
    );

  const paymentLabel: Record<ReservationRow['payment_status'], string> = {
    unpaid: t('status.reservationPayment.unpaid'),
    partially_paid: t('status.reservationPayment.partially_paid'),
    paid: t('status.reservationPayment.paid'),
    cancelled: t('status.reservationPayment.cancelled'),
  };
  const statusLabel = (key: string) => {
    const translated = t(`status.reservation.${key}`);
    return translated === `status.reservation.${key}` ? key : translated;
  };

  return (
    <section>
      <h1>{t('reservations.title')}</h1>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {msg && (
        <p className="alert success" role="status">
          {msg}
        </p>
      )}
      {rows !== null && rows.length === 0 && <p className="empty">{t('reservations.none')}</p>}
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
                👥 {t('reservations.seats', { count: r.seats, amount: Number(r.total_price).toLocaleString(locale), currency: r.currency })}
              </span>
            </div>
            <div className="meta">
              <span className={`chip ${r.payment_status}`}>💳 {paymentLabel[r.payment_status]}</span>
              {Number(r.amount_paid) > 0 && (
                <span>{t('reservations.paid', { amount: Number(r.amount_paid).toLocaleString(locale), currency: r.currency })}</span>
              )}
              {r.status !== 'cancelled' && Number(r.balance_due) > 0 && (
                <span>{t('reservations.balanceDue', { amount: Number(r.balance_due).toLocaleString(locale), currency: r.currency })}</span>
              )}
              {r.status !== 'cancelled' && Number(r.balance_due) > 0 && (
                <PayOnlineAction reservationId={r.id} onSettled={() => void load()} />
              )}
              {r.status !== 'cancelled' && Number(r.balance_due) > 0 && (
                <PayWithWalletAction reservationId={r.id} onSettled={() => void load()} />
              )}
              {r.status !== 'cancelled' && Number(r.balance_due) > 0 && (
                <PromoCodeAction reservationId={r.id} onSettled={() => void load()} />
              )}
              {Number(r.amount_paid) > 0 && (
                <a
                  className="btn ghost small"
                  href={fileUrl(`/api/reservations/${r.id}/receipt.pdf`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('reservations.receiptPdf')}
                </a>
              )}
              {r.refund_status !== 'none' && (
                <span>
                  {t(r.refund_status === 'full' ? 'reservations.refundedFull' : 'reservations.refundedPartial', {
                    amount: Number(r.refunded_amount).toLocaleString(locale),
                    currency: r.currency,
                  })}
                </span>
              )}
            </div>
            {r.trip_status === 'in_progress' && r.status === 'confirmed' && <LiveEta reservationId={r.id} />}
            {r.status !== 'cancelled' && (
              <div className="meta" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <ConversationAction apiBase={`/api/reservations/${r.id}`} myRole="customer" />
                <RevealContactAction apiBase={`/api/reservations/${r.id}`} />
                <ShareLinkAction apiBase={`/api/reservations/${r.id}`} />
                <PassengersAction apiBase={`/api/reservations/${r.id}`} seats={r.seats} />
                <RequirementsAction apiBase={`/api/reservations/${r.id}`} />
              </div>
            )}
            <div className="foot">
              <span className={`chip ${r.status}`}>{statusLabel(r.status)}</span>
              {(r.status === 'pending' || r.status === 'confirmed') && (
                <button className="btn danger small" onClick={() => void cancel(r.id)}>
                  {t('reservations.cancel')}
                </button>
              )}
              {r.status === 'cancelled' && (
                <button className="btn danger small" onClick={() => void remove(r.id)}>
                  {t('reservations.delete')}
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
