import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDateTime } from '../api';
import type { EmergencyContactRow, FavoriteDriverRow, FavoriteRouteRow, WaitlistEntryRow } from '../types';
import SosButton from './SosButton';

/** Task 11.5 — emergency contacts management + the SOS trigger itself. */
export function EmergencyContactsCard() {
  const [contacts, setContacts] = useState<EmergencyContactRow[]>([]);
  const [form, setForm] = useState({ full_name: '', phone: '', relationship: '' });
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api<{ contacts: EmergencyContactRow[] }>('/api/customer/emergency-contacts')
      .then((r) => setContacts(r.contacts))
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(load, [load]);

  const add = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/customer/emergency-contacts', { method: 'POST', body: form });
      setForm({ full_name: '', phone: '', relationship: '' });
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };
  const remove = async (id: string): Promise<void> => {
    await api(`/api/customer/emergency-contacts/${id}`, { method: 'DELETE' }).catch(() => undefined);
    load();
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Contacts d'urgence &amp; SOS</h2>
      {msg && <p style={{ color: 'var(--danger)' }}>{msg}</p>}
      <p className="muted small">En cas de problème pendant un trajet, utilisez le bouton SOS ci-dessous — votre position est transmise à notre équipe.</p>
      <SosButton role="customer" />
      <h3 style={{ fontSize: '0.9rem', marginTop: 16 }}>Mes contacts d'urgence</h3>
      {contacts.length === 0 && <p className="empty">Aucun contact enregistré.</p>}
      {contacts.map((c) => (
        <div key={c.id} className="meta" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {c.full_name} — {c.phone} {c.relationship ? `(${c.relationship})` : ''}
          </span>
          <button className="btn ghost small" onClick={() => void remove(c.id)}>
            Supprimer
          </button>
        </div>
      ))}
      <form className="form-inline" onSubmit={(e) => void add(e)} style={{ marginTop: 10 }}>
        <label>
          Nom
          <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>
        <label>
          Téléphone
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label>
          Lien (optionnel)
          <input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
        </label>
        <button className="btn primary">Ajouter</button>
      </form>
    </div>
  );
}

/** Task 10.5 — favorite routes/drivers management. */
export function FavoritesCard() {
  const [routes, setRoutes] = useState<FavoriteRouteRow[]>([]);
  const [drivers, setDrivers] = useState<FavoriteDriverRow[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    Promise.all([
      api<{ routes: FavoriteRouteRow[] }>('/api/customer/favorites/routes'),
      api<{ drivers: FavoriteDriverRow[] }>('/api/customer/favorites/drivers'),
    ])
      .then(([r, d]) => {
        setRoutes(r.routes);
        setDrivers(d.drivers);
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(load, [load]);

  const removeRoute = async (id: string): Promise<void> => {
    await api(`/api/customer/favorites/routes/${id}`, { method: 'DELETE' }).catch(() => undefined);
    load();
  };
  const removeDriver = async (id: string): Promise<void> => {
    await api(`/api/customer/favorites/drivers/${id}`, { method: 'DELETE' }).catch(() => undefined);
    load();
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Mes favoris</h2>
      {msg && <p style={{ color: 'var(--danger)' }}>{msg}</p>}
      <h3 style={{ fontSize: '0.9rem' }}>Trajets favoris</h3>
      {routes.length === 0 && <p className="empty">Aucun trajet favori — ajoutez-en un depuis la page d'un voyage.</p>}
      {routes.map((r) => (
        <div key={r.id} className="meta" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <span>
            {r.origin_label} → {r.destination_label}
          </span>
          <button className="btn ghost small" onClick={() => void removeRoute(r.id)}>
            Retirer
          </button>
        </div>
      ))}
      <h3 style={{ fontSize: '0.9rem', marginTop: 14 }}>Chauffeurs favoris</h3>
      {drivers.length === 0 && <p className="empty">Aucun chauffeur favori.</p>}
      {drivers.map((d) => (
        <div key={d.id} className="meta" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <span>{d.driver_name}</span>
          <button className="btn ghost small" onClick={() => void removeDriver(d.id)}>
            Retirer
          </button>
        </div>
      ))}
    </div>
  );
}

/** Task 10.2 — waitlist entries the customer currently holds. */
export function WaitlistCard() {
  const [entries, setEntries] = useState<WaitlistEntryRow[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api<{ entries: WaitlistEntryRow[] }>('/api/customer/waitlist')
      .then((r) => setEntries(r.entries))
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(load, [load]);

  const cancel = async (id: string): Promise<void> => {
    await api(`/api/customer/waitlist/${id}/cancel`, { method: 'POST', body: {} }).catch(() => undefined);
    load();
  };

  const STATUS_LABEL: Record<string, string> = {
    waiting: "En attente",
    offered: 'Place proposée',
    confirmed: 'Confirmée',
    expired: 'Expirée',
    cancelled: 'Annulée',
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Ma liste d'attente</h2>
      {msg && <p style={{ color: 'var(--danger)' }}>{msg}</p>}
      {entries.length === 0 && <p className="empty">Vous n'êtes sur aucune liste d'attente.</p>}
      {entries.map((e) => (
        <div key={e.id} className="meta" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {e.trip_code ? (
              <Link to={`/trips/${e.trip_id}`}>{e.trip_code}</Link>
            ) : (
              'Voyage'
            )}{' '}
            — {e.seats} place(s) — position #{e.position} — <span className="pill">{STATUS_LABEL[e.status] ?? e.status}</span>
            {e.departure_at ? ` — ${fmtDateTime(e.departure_at)}` : ''}
          </span>
          {(e.status === 'waiting' || e.status === 'offered') && (
            <button className="btn ghost small" onClick={() => void cancel(e.id)}>
              Annuler
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
