import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import type { DriverRow, TrajectoryRow, VehicleRow, Wilaya, WpointRow } from '../types';

type Tab = 'trips' | 'trajectories' | 'drivers' | 'vehicles';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'trips', label: 'Voyages' },
  { id: 'trajectories', label: 'Trajectoires' },
  { id: 'drivers', label: 'Chauffeurs' },
  { id: 'vehicles', label: 'Véhicules' },
];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('trips');

  if (loading) return <p className="empty">Chargement…</p>;
  if (user?.role !== 'admin') return <p className="empty">Accès réservé aux administrateurs.</p>;

  return (
    <section>
      <h1>Administration</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'trips' && <TripsTab />}
      {tab === 'trajectories' && <TrajectoriesTab />}
      {tab === 'drivers' && <DriversTab />}
      {tab === 'vehicles' && <VehiclesTab />}
    </section>
  );
}

// ── Voyages ──────────────────────────────────────────────────────────────────

interface TripRow {
  id: string;
  code: string;
  status: string;
  published_at: string | null;
  departure_at: string;
  capacity: number;
  seat_price: string;
  currency: string;
  driver_name: string | null;
  vehicle_matricule: string | null;
  trajectory_name: string;
  seats_available: number | null;
  nb_active_reservations: number | string;
}

function TripsTab() {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [trajectories, setTrajectories] = useState<TrajectoryRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [form, setForm] = useState({ trajectory_id: '', driver_id: '', vehicle_id: '', departure_at: '', capacity: '20', seat_price: '0' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [t, tj, d, v] = await Promise.all([
      api<{ trips: TripRow[] }>('/api/admin/trips'),
      api<{ trajectories: TrajectoryRow[] }>('/api/admin/trajectories'),
      api<{ drivers: DriverRow[] }>('/api/admin/drivers'),
      api<{ vehicles: VehicleRow[] }>('/api/admin/vehicles'),
    ]);
    setTrips(t.trips);
    setTrajectories(tj.trajectories);
    setDrivers(d.drivers);
    setVehicles(v.vehicles);
  }, []);

  useEffect(() => {
    load().catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, [load]);

  const create = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/admin/trips', {
        method: 'POST',
        body: {
          trajectory_id: form.trajectory_id,
          driver_id: form.driver_id || null,
          vehicle_id: form.vehicle_id || null,
          departure_at: new Date(form.departure_at).toISOString(),
          capacity: Number(form.capacity),
          seat_price: Number(form.seat_price),
        },
      });
      setMsg('✔ Voyage créé (brouillon non publié)');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const act = async (id: string, action: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/trips/${id}/${action}`, { method: 'POST', body: {} });
      setMsg(`✔ ${action} — ok`);
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && <p className="alert info">{msg}</p>}
      <form className="card form-grid" onSubmit={(e) => void create(e)}>
        <label>
          Trajectoire
          <select required value={form.trajectory_id} onChange={(e) => setForm({ ...form, trajectory_id: e.target.value })}>
            <option value="">—</option>
            {trajectories.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chauffeur
          <select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })}>
            <option value="">—</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Véhicule
          <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
            <option value="">—</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.matricule} ({v.seats} pl.)
              </option>
            ))}
          </select>
        </label>
        <label>
          Départ
          <input type="datetime-local" required value={form.departure_at} onChange={(e) => setForm({ ...form, departure_at: e.target.value })} />
        </label>
        <label>
          Capacité
          <input type="number" min={1} required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        </label>
        <label>
          Prix/place (secours)
          <input type="number" min={0} step="0.01" value={form.seat_price} onChange={(e) => setForm({ ...form, seat_price: e.target.value })} />
        </label>
        <button className="btn primary">Créer le voyage</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Trajectoire</th>
              <th>Départ</th>
              <th>Places</th>
              <th>Résa.</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id}>
                <td>{t.code}</td>
                <td>{t.trajectory_name}</td>
                <td>{fmtDateTime(t.departure_at)}</td>
                <td>
                  {t.seats_available ?? '—'}/{t.capacity}
                </td>
                <td>{String(t.nb_active_reservations)}</td>
                <td>
                  <span className={`chip ${t.status}`}>{t.status}</span>
                  {!t.published_at && <span className="chip draft">non publié</span>}
                </td>
                <td className="actions">
                  <button className="btn ghost small" onClick={() => void act(t.id, 'stops')}>
                    Arrêts
                  </button>
                  {!t.published_at && (
                    <button className="btn primary small" onClick={() => void act(t.id, 'publish')}>
                      Publier
                    </button>
                  )}
                  <button className="btn ghost small" onClick={() => void act(t.id, 'prices/populate')}>
                    Prix défaut
                  </button>
                  {(t.status === 'scheduled' || t.status === 'in_progress') && (
                    <button className="btn danger small" onClick={() => void act(t.id, 'cancel')}>
                      Annuler
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Trajectoires ─────────────────────────────────────────────────────────────

function TrajectoriesTab() {
  const [rows, setRows] = useState<TrajectoryRow[]>([]);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [wpoints, setWpoints] = useState<WpointRow[]>([]);
  const [name, setName] = useState('');
  const [wilayaId, setWilayaId] = useState('');
  const [price, setPrice] = useState({ from: '', to: '', amount: '' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [t, w] = await Promise.all([
      api<{ trajectories: TrajectoryRow[] }>('/api/admin/trajectories'),
      api<{ wilayas: Wilaya[] }>('/api/registry/wilayas'),
    ]);
    setRows(t.trajectories);
    setWilayas(w.wilayas);
  }, []);

  useEffect(() => {
    load().catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setWpoints([]);
      return;
    }
    api<{ wpoints: WpointRow[] }>(`/api/admin/trajectories/${selected}/wpoints`)
      .then((r) => setWpoints(r.wpoints))
      .catch(() => setWpoints([]));
    setPrice({ from: '', to: '', amount: '' });
  }, [selected]);

  const create = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/admin/trajectories', { method: 'POST', body: { name } });
      setName('');
      setMsg('✔ Trajectoire créée');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const addWpoint = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api(`/api/admin/trajectories/${selected}/wpoints`, { method: 'POST', body: { wilaya_id: Number(wilayaId) } });
      setMsg('✔ Arrêt ajouté');
      setWilayaId('');
      await load();
      const r = await api<{ wpoints: WpointRow[] }>(`/api/admin/trajectories/${selected}/wpoints`);
      setWpoints(r.wpoints);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const setDefaultPrice = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api(`/api/admin/trajectories/${selected}/prices`, {
        method: 'POST',
        body: { from_wpoint_id: price.from, to_wpoint_id: price.to, price: Number(price.amount) },
      });
      setMsg('✔ Tarif par défaut enregistré');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && <p className="alert info">{msg}</p>}
      <form className="card form-inline" onSubmit={(e) => void create(e)}>
        <label>
          Nouvelle trajectoire
          <input required minLength={2} placeholder="Alger — Oran" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn primary">Créer</button>
      </form>

      <div className="form-inline select-row">
        <label>
          Gérer
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">— Choisir une trajectoire —</option>
            {rows.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.nb_wpoints} arrêts)
              </option>
            ))}
          </select>
        </label>
      </div>

      {selected && (
        <div className="detail-grid">
          <div className="card">
            <h2>Arrêts</h2>
            <ol className="stops">
              {wpoints.map((w) => (
                <li key={w.id}>
                  <span className="dot" />
                  <div>
                    <strong>{w.nom_fr}</strong> <span className="muted">({w.nom_ar})</span>
                  </div>
                </li>
              ))}
            </ol>
            <form className="form-inline" onSubmit={(e) => void addWpoint(e)}>
              <label>
                Ajouter un arrêt
                <select required value={wilayaId} onChange={(e) => setWilayaId(e.target.value)}>
                  <option value="">— Wilaya —</option>
                  {wilayas.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nom_fr}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn primary">Ajouter</button>
            </form>
          </div>

          <div className="card">
            <h2>Tarif par défaut</h2>
            <form className="form-grid" onSubmit={(e) => void setDefaultPrice(e)}>
              <label>
                De
                <select required value={price.from} onChange={(e) => setPrice({ ...price, from: e.target.value })}>
                  <option value="">—</option>
                  {wpoints.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nom_fr}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                À
                <select required value={price.to} onChange={(e) => setPrice({ ...price, to: e.target.value })}>
                  <option value="">—</option>
                  {wpoints.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nom_fr}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Prix (DZD)
                <input type="number" min={0} required value={price.amount} onChange={(e) => setPrice({ ...price, amount: e.target.value })} />
              </label>
              <button className="btn primary">Enregistrer</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chauffeurs ───────────────────────────────────────────────────────────────

function DriversTab() {
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [form, setForm] = useState({ full_name: '', nin: '', phone: '' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setRows((await api<{ drivers: DriverRow[] }>('/api/admin/drivers')).drivers);
  }, []);
  useEffect(() => {
    load().catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, [load]);

  const create = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/admin/drivers', { method: 'POST', body: form });
      setForm({ full_name: '', nin: '', phone: '' });
      setMsg('✔ Chauffeur ajouté');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const remove = async (id: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/drivers/${id}`, { method: 'DELETE' });
      setMsg('✔ Supprimé');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && <p className="alert info">{msg}</p>}
      <form className="card form-grid" onSubmit={(e) => void create(e)}>
        <label>
          Nom complet
          <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>
        <label>
          NIN (18 chiffres)
          <input required pattern="\d{18}" value={form.nin} onChange={(e) => setForm({ ...form, nin: e.target.value })} />
        </label>
        <label>
          Téléphone
          <input required pattern="^\+?[0-9]{8,15}$" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <button className="btn primary">Ajouter</button>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>NIN</th>
              <th>Téléphone</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td>{d.full_name}</td>
                <td>{d.nin}</td>
                <td>{d.phone}</td>
                <td>
                  <button className="btn danger small" onClick={() => void remove(d.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Véhicules ────────────────────────────────────────────────────────────────

function VehiclesTab() {
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [form, setForm] = useState({ matricule: '', seats: '20', make: '', model: '' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setRows((await api<{ vehicles: VehicleRow[] }>('/api/admin/vehicles')).vehicles);
  }, []);
  useEffect(() => {
    load().catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, [load]);

  const create = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/admin/vehicles', {
        method: 'POST',
        body: { matricule: form.matricule, seats: Number(form.seats), make: form.make || undefined, model: form.model || undefined },
      });
      setForm({ matricule: '', seats: '20', make: '', model: '' });
      setMsg('✔ Véhicule ajouté');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const remove = async (id: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/vehicles/${id}`, { method: 'DELETE' });
      setMsg('✔ Supprimé');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && <p className="alert info">{msg}</p>}
      <form className="card form-grid" onSubmit={(e) => void create(e)}>
        <label>
          Matricule
          <input required minLength={3} value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} />
        </label>
        <label>
          Places
          <input type="number" min={1} required value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
        </label>
        <label>
          Marque
          <input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
        </label>
        <label>
          Modèle
          <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </label>
        <button className="btn primary">Ajouter</button>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Places</th>
              <th>Marque / modèle</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td>{v.matricule}</td>
                <td>{v.seats}</td>
                <td>
                  {[v.make, v.model].filter(Boolean).join(' ') || '—'}
                </td>
                <td>
                  <button className="btn danger small" onClick={() => void remove(v.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
