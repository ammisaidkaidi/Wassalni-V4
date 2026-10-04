import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, fmtDateTime } from '../api';
import { useI18n } from '../i18n';
import type { MessageRow, ReservationPassengerRow } from '../types';

/**
 * These components are shared by the customer (`MyReservationsPage`) and
 * driver (`DriverPage`) sides of a reservation — both hit a parallel pair
 * of routes (`/api/reservations/:id/...` vs `/api/driver/reservations/:id/...`)
 * that wrap the exact same domain.ts/SQL functions, so `apiBase` is the only
 * thing that differs between the two call sites.
 */

/** Task 11.2 — in-app messaging thread for one reservation. */
export function ConversationAction({ apiBase, myRole }: { apiBase: string; myRole: 'customer' | 'driver' }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async (): Promise<void> => {
    try {
      const r = await api<{ messages: MessageRow[] }>(`${apiBase}/conversation`);
      setMessages(r.messages);
      await api(`${apiBase}/conversation/read`, { method: 'POST', body: {} }).catch(() => undefined);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const send = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!body.trim()) return;
    setMsg('');
    try {
      await api(`${apiBase}/conversation/messages`, { method: 'POST', body: { body: body.trim() } });
      setBody('');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  if (!open)
    return (
      <button className="btn ghost small" onClick={() => setOpen(true)}>
        {t('reservationExtras.messagesBtn')}
      </button>
    );

  return (
    <div className="mini-card" style={{ width: '100%' }}>
      <div className="notif-panel-head" style={{ border: 'none', padding: 0 }}>
        <strong>{t('reservationExtras.messagingTitle')}</strong>
        <button className="btn ghost small" onClick={() => setOpen(false)}>
          {t('reservationExtras.close')}
        </button>
      </div>
      {msg && (
        <p style={{ color: 'var(--danger)' }} role="alert">
          {msg}
        </p>
      )}
      <div className="chat-thread">
        {messages.length === 0 && <p className="empty">{t('reservationExtras.noMessages')}</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg${m.sender_role === myRole ? ' mine' : ''}`}>
            {m.body}
            <span className="chat-meta">{fmtDateTime(m.created_at)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="form-inline" onSubmit={(e) => void send(e)}>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('reservationExtras.messagePlaceholder')}
          aria-label={t('reservationExtras.messagePlaceholder')}
        />
        <button className="btn primary small">{t('reservationExtras.send')}</button>
      </form>
    </div>
  );
}

/** Task 11.3 — masked contact reveal. */
export function RevealContactAction({ apiBase }: { apiBase: string }) {
  const { t } = useI18n();
  const [phone, setPhone] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const reveal = async (): Promise<void> => {
    setBusy(true);
    setMsg('');
    try {
      const r = await api<{ phone: string }>(`${apiBase}/reveal-contact`, { method: 'POST', body: {} });
      setPhone(r.phone);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (phone) return <span className="pill">📞 {phone}</span>;

  return (
    <span>
      <button className="btn ghost small" disabled={busy} onClick={() => void reveal()}>
        {t('reservationExtras.showContact')}
      </button>
      {msg && (
        <span className="muted small" role="alert">
          {' '}
          {msg}
        </span>
      )}
    </span>
  );
}

/** Task 11.4 — shareable live-tracking link for this reservation. */
export function ShareLinkAction({ apiBase }: { apiBase: string }) {
  const { t } = useI18n();
  const [link, setLink] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async (): Promise<void> => {
    setBusy(true);
    setMsg('');
    try {
      const r = await api<{ token: string }>(`${apiBase}/share-links`, { method: 'POST', body: {} });
      setLink(`${window.location.origin}/track/${r.token}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (link)
    return (
      <span className="muted small">
        {t('reservationExtras.trackingLinkLabel')}{' '}
        <a href={link} target="_blank" rel="noreferrer">
          {link}
        </a>{' '}
        <button
          className="btn ghost small"
          onClick={() => {
            void navigator.clipboard?.writeText(link);
          }}
        >
          {t('reservationExtras.copy')}
        </button>
      </span>
    );

  return (
    <span>
      <button className="btn ghost small" disabled={busy} onClick={() => void create()}>
        {t('reservationExtras.shareTracking')}
      </button>
      {msg && (
        <span className="muted small" role="alert">
          {' '}
          {msg}
        </span>
      )}
    </span>
  );
}

/** Task 10.6 — named passenger list for a multi-seat group booking. */
export function PassengersAction({ apiBase, seats }: { apiBase: string; seats: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<{ full_name: string; phone: string; fare_share: string }[]>([]);
  const [msg, setMsg] = useState('');
  const [saved, setSaved] = useState(false);

  const load = async (): Promise<void> => {
    try {
      const r = await api<{ passengers: ReservationPassengerRow[] }>(`${apiBase}/passengers`);
      if (r.passengers.length > 0) {
        setRows(r.passengers.map((p) => ({ full_name: p.full_name, phone: p.phone ?? '', fare_share: p.fare_share ?? '' })));
        setSaved(true);
      } else {
        setRows(Array.from({ length: seats }, () => ({ full_name: '', phone: '', fare_share: '' })));
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api(`${apiBase}/passengers`, {
        method: 'PUT',
        body: {
          passengers: rows.map((r) => ({
            full_name: r.full_name,
            phone: r.phone || null,
            fare_share: r.fare_share !== '' ? Number(r.fare_share) : null,
          })),
        },
      });
      setSaved(true);
      setMsg(t('reservationExtras.passengersSaved'));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  if (seats < 2) return null;
  if (!open)
    return (
      <button className="btn ghost small" onClick={() => setOpen(true)}>
        {t('reservationExtras.passengersBtn')} {saved ? '✔' : ''}
      </button>
    );

  return (
    <div className="mini-card" style={{ width: '100%' }}>
      <div className="notif-panel-head" style={{ border: 'none', padding: 0 }}>
        <strong>{t('reservationExtras.passengersTitle', { seats })}</strong>
        <button className="btn ghost small" onClick={() => setOpen(false)}>
          {t('reservationExtras.close')}
        </button>
      </div>
      {msg && (
        <p className="muted small" role="status">
          {msg}
        </p>
      )}
      <form onSubmit={(e) => void save(e)}>
        {rows.map((r, i) => (
          <div key={i} className="form-inline">
            <label htmlFor={`passenger-name-${i}`}>
              {t('reservationExtras.nameN', { n: i + 1 })}
              <input
                id={`passenger-name-${i}`}
                required
                value={r.full_name}
                onChange={(e) => setRows((prev) => prev.map((p, j) => (j === i ? { ...p, full_name: e.target.value } : p)))}
              />
            </label>
            <label htmlFor={`passenger-phone-${i}`}>
              {t('reservationExtras.phoneOptional')}
              <input
                id={`passenger-phone-${i}`}
                value={r.phone}
                onChange={(e) => setRows((prev) => prev.map((p, j) => (j === i ? { ...p, phone: e.target.value } : p)))}
              />
            </label>
            <label htmlFor={`passenger-fare-${i}`}>
              {t('reservationExtras.fareShareOptional')}
              <input
                id={`passenger-fare-${i}`}
                type="number"
                value={r.fare_share}
                onChange={(e) => setRows((prev) => prev.map((p, j) => (j === i ? { ...p, fare_share: e.target.value } : p)))}
              />
            </label>
          </div>
        ))}
        <button className="btn primary small">{t('reservationExtras.save')}</button>
      </form>
    </div>
  );
}

/** Task 10.7 — accessibility / service requirements for this reservation. */
export function RequirementsAction({ apiBase }: { apiBase: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [wheelchair, setWheelchair] = useState(false);
  const [pet, setPet] = useState(false);
  const [luggage, setLuggage] = useState('0');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');

  const save = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api(`${apiBase}/requirements`, {
        method: 'PUT',
        body: { needs_wheelchair: wheelchair, has_pet: pet, luggage_count: Number(luggage) || 0, special_requirements: notes || null },
      });
      setMsg(t('reservationExtras.requirementsSaved'));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  if (!open)
    return (
      <button className="btn ghost small" onClick={() => setOpen(true)}>
        {t('reservationExtras.requirementsBtn')}
      </button>
    );

  return (
    <div className="mini-card" style={{ width: '100%' }}>
      <div className="notif-panel-head" style={{ border: 'none', padding: 0 }}>
        <strong>{t('reservationExtras.requirementsTitle')}</strong>
        <button className="btn ghost small" onClick={() => setOpen(false)}>
          {t('reservationExtras.close')}
        </button>
      </div>
      {msg && (
        <p className="muted small" role="status">
          {msg}
        </p>
      )}
      <form className="form-inline" onSubmit={(e) => void save(e)}>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={wheelchair} onChange={(e) => setWheelchair(e.target.checked)} />
          {t('reservationExtras.wheelchair')}
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={pet} onChange={(e) => setPet(e.target.checked)} />
          {t('reservationExtras.pet')}
        </label>
        <label htmlFor="requirements-luggage">
          {t('reservationExtras.luggage')}
          <input
            id="requirements-luggage"
            type="number"
            min={0}
            value={luggage}
            onChange={(e) => setLuggage(e.target.value)}
          />
        </label>
        <label htmlFor="requirements-notes">
          {t('reservationExtras.notes')}
          <input id="requirements-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button className="btn primary small">{t('reservationExtras.save')}</button>
      </form>
    </div>
  );
}
