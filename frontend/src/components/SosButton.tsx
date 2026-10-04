import { useState } from 'react';
import { api } from '../api';
import { useI18n } from '../i18n';

/**
 * Task 11.5 — SOS trigger, usable from either the customer or driver side
 * (both roles have an identical POST /api/{role}/sos endpoint). Optionally
 * scoped to one reservation ongoing right now.
 */
export default function SosButton({ role, reservationId }: { role: 'customer' | 'driver'; reservationId?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const trigger = async (): Promise<void> => {
    setSending(true);
    setError('');
    try {
      let coords: { lat?: number; lon?: number } = {};
      if ('geolocation' in navigator) {
        coords = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => resolve({}),
            { timeout: 3000 },
          );
        });
      }
      await api(`/api/${role}/sos`, {
        method: 'POST',
        body: {
          reservation_id: reservationId ?? null,
          lat: coords.lat ?? null,
          lon: coords.lon ?? null,
          notes: notes.trim() || null,
        },
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button className="sos-btn" onClick={() => setOpen(true)}>
        {t('sos.button')}
      </button>
    );
  }

  return (
    <div className="mini-card" style={{ borderColor: 'var(--danger)' }}>
      {sent ? (
        <>
          <p>
            <strong>{t('sos.sentTitle')}</strong> {t('sos.sentBody')}
          </p>
          <button className="btn ghost small" onClick={() => setOpen(false)}>
            {t('sos.close')}
          </button>
        </>
      ) : (
        <>
          <p>
            <strong>{t('sos.confirmTitle')}</strong> {t('sos.confirmBody')}
          </p>
          <label htmlFor="sos-message">
            {t('sos.messageLabel')}
            <input
              id="sos-message"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('sos.messagePlaceholder')}
            />
          </label>
          {error && (
            <p style={{ color: 'var(--danger)' }} role="alert">
              {error}
            </p>
          )}
          <div className="table actions">
            <button className="sos-btn" disabled={sending} onClick={() => void trigger()}>
              {sending ? t('sos.sending') : t('sos.confirmAlert')}
            </button>
            <button className="btn ghost small" onClick={() => setOpen(false)}>
              {t('sos.cancel')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
