import { useState } from 'react';
import { api } from '../api';

/**
 * Task 11.5 — SOS trigger, usable from either the customer or driver side
 * (both roles have an identical POST /api/{role}/sos endpoint). Optionally
 * scoped to one reservation ongoing right now.
 */
export default function SosButton({ role, reservationId }: { role: 'customer' | 'driver'; reservationId?: string }) {
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
        body: { reservation_id: reservationId ?? null, lat: coords.lat ?? null, lon: coords.lon ?? null, notes: notes.trim() || null },
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
        🆘 SOS
      </button>
    );
  }

  return (
    <div className="mini-card" style={{ borderColor: 'var(--danger)' }}>
      {sent ? (
        <>
          <p>
            <strong>✔ Alerte envoyée.</strong> Notre équipe a été prévenue et va vous contacter. En cas d'urgence vitale, appelez directement les
            secours (17 / 14).
          </p>
          <button className="btn ghost small" onClick={() => setOpen(false)}>
            Fermer
          </button>
        </>
      ) : (
        <>
          <p>
            <strong>Déclencher une alerte SOS ?</strong> Votre position (si autorisée) et un message optionnel seront transmis immédiatement à
            notre équipe de sécurité.
          </p>
          <label>
            Message (optionnel)
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ce qui se passe…" />
          </label>
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
          <div className="table actions">
            <button className="sos-btn" disabled={sending} onClick={() => void trigger()}>
              {sending ? 'Envoi…' : "Confirmer l'alerte"}
            </button>
            <button className="btn ghost small" onClick={() => setOpen(false)}>
              Annuler
            </button>
          </div>
        </>
      )}
    </div>
  );
}
