import { Fragment, useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, fileUrl, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import WpointManager from '../components/WpointManager';
import type {
  AdminReservationRow,
  CustomerRow,
  DomainErrorRow,
  DriverRow,
  KycDocType,
  KycDocumentRow,
  NoShowEventRow,
  PaymentRow,
  RefundWorklistRow,
  TrackingRow,
  TrajectoryRow,
  VehicleRow,
  Wilaya,
  WpointRow,
} from '../types';

type Tab =
  | 'trips'
  | 'trajectories'
  | 'drivers'
  | 'vehicles'
  | 'customers'
  | 'reservations'
  | 'payments'
  | 'tracking'
  | 'no-show'
  | 'kyc'
  | 'errors';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'trips', label: 'Voyages' },
  { id: 'trajectories', label: 'Trajectoires' },
  { id: 'drivers', label: 'Chauffeurs' },
  { id: 'vehicles', label: 'Véhicules' },
  { id: 'customers', label: 'Clients' },
  { id: 'reservations', label: 'Réservations' },
  { id: 'payments', label: 'Paiements' },
  { id: 'tracking', label: 'Suivi GPS' },
  { id: 'no-show', label: 'Absences' },
  { id: 'kyc', label: 'KYC chauffeurs' },
  { id: 'errors', label: 'Codes erreurs' },
];

const KYC_DOC_LABEL: Record<KycDocType, string> = {
  identity: "Pièce d'identité",
  license: 'Permis de conduire',
  vehicle_registration: 'Carte grise du véhicule',
  insurance: "Attestation d'assurance",
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('trips');
  // Pending-refund count shown as a badge on the "Paiements" tab, so admins
  // notice outstanding refunds without having to open the tab first.
  const [pendingRefunds, setPendingRefunds] = useState(0);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    api<{ worklist: RefundWorklistRow[] }>('/api/admin/refunds-worklist')
      .then((r) => setPendingRefunds(r.worklist.length))
      .catch(() => {
        /* badge is a convenience — silently skip if it fails to load */
      });
  }, [user]);

  if (loading) return <p className="empty">Chargement…</p>;
  if (user?.role !== 'admin')
    return (
      <p className="empty">
        <Link to="/login?next=/admin">Connectez-vous avec un compte administrateur</Link> pour accéder à cette section.
      </p>
    );

  return (
    <section>
      <h1>Administration</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'payments' && pendingRefunds > 0 && <span className="tab-badge">{pendingRefunds}</span>}
          </button>
        ))}
      </div>
      {tab === 'trips' && <TripsTab />}
      {tab === 'trajectories' && <TrajectoriesTab />}
      {tab === 'drivers' && <DriversTab />}
      {tab === 'vehicles' && <VehiclesTab />}
      {tab === 'customers' && <CustomersTab />}
      {tab === 'reservations' && <ReservationsTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'tracking' && <TrackingTab />}
      {tab === 'no-show' && <NoShowTab />}
      {tab === 'kyc' && <KycReviewTab />}
      {tab === 'errors' && <ErrorsTab />}
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

  // Task 5.3 — the driver never started a scheduled trip: record the strike
  // (flag-only — see NoShowTab) and cancel the trip since it can't proceed.
  const reportDriverNoShow = async (id: string): Promise<void> => {
    if (!confirm("Confirmer : le conducteur ne s'est pas présenté pour ce voyage ? Le voyage sera annulé.")) return;
    const notes = window.prompt('Note (optionnel) :', '') ?? undefined;
    setMsg('');
    try {
      await api(`/api/admin/trips/${id}/driver-no-show`, { method: 'POST', body: { notes } });
      setMsg('✔ Absence du conducteur enregistrée, voyage annulé');
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
                  {t.status === 'scheduled' && t.published_at && (
                    <button className="btn primary small" onClick={() => void act(t.id, 'start')}>
                      Démarrer
                    </button>
                  )}
                  {t.status === 'in_progress' && (
                    <button className="btn primary small" onClick={() => void act(t.id, 'close')}>
                      Clôturer
                    </button>
                  )}
                  {(t.status === 'scheduled' || t.status === 'in_progress') && (
                    <button className="btn danger small" onClick={() => void act(t.id, 'cancel')}>
                      Annuler
                    </button>
                  )}
                  {t.status === 'scheduled' && (
                    <button className="btn danger small" onClick={() => void reportDriverNoShow(t.id)}>
                      Absence conducteur
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
            <WpointManager basePath="/api/admin" trajectoryId={selected} wilayas={wilayas} onWpointsChange={setWpoints} />
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
  const [accountFor, setAccountFor] = useState<string | null>(null);

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
              <th>Absences</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <Fragment key={d.id}>
                <tr>
                  <td>{d.full_name}</td>
                  <td>{d.nin}</td>
                  <td>{d.phone}</td>
                  <td>
                    {d.no_show_count ?? 0}
                    {d.flagged_at && <span className="chip cancelled" style={{ marginLeft: 6 }}>⚠ signalé</span>}
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn ghost small" onClick={() => setAccountFor(accountFor === d.id ? null : d.id)}>
                      {accountFor === d.id ? 'Fermer' : 'Accès chauffeur'}
                    </button>
                    <button className="btn danger small" onClick={() => void remove(d.id)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
                {accountFor === d.id && (
                  <tr>
                    <td colSpan={5}>
                      <DriverAccountPanel driverId={d.id} defaultEmail={d.email} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface DriverAccount {
  email: string;
  role: string;
}

function DriverAccountPanel({ driverId, defaultEmail }: { driverId: string; defaultEmail: string | null }) {
  const [account, setAccount] = useState<DriverAccount | null | undefined>(undefined); // undefined = loading
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ account: DriverAccount | null }>(`/api/admin/drivers/${driverId}/account`);
      setAccount(r.account);
      if (r.account) setEmail(r.account.email);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
      setAccount(null);
    }
  }, [driverId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    try {
      await api(`/api/admin/drivers/${driverId}/account`, { method: 'POST', body: { email, password } });
      setPassword('');
      setMsg('✔ Accès chauffeur enregistré — communiquez ces identifiants au chauffeur');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ background: 'var(--bg-soft, #f8fafc)' }}>
      <p className="muted" style={{ marginTop: 0 }}>
        {account === undefined
          ? 'Chargement…'
          : account
            ? `Compte existant : ${account.email} — définissez un nouveau mot de passe ci-dessous pour le réinitialiser.`
            : "Aucun compte de connexion pour ce chauffeur — créez-en un pour lui donner accès à l'espace chauffeur."}
      </p>
      {msg && <p className="alert info">{msg}</p>}
      <form className="form-grid" onSubmit={(e) => void submit(e)}>
        <label>
          Email de connexion
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Mot de passe {account ? '(nouveau)' : ''}
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn primary" disabled={busy}>
          {account ? 'Réinitialiser le mot de passe' : "Créer l'accès"}
        </button>
      </form>
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

// ── Clients ──────────────────────────────────────────────────────────────────

function CustomersTab() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setRows((await api<{ customers: CustomerRow[] }>('/api/admin/customers')).customers);
  }, []);
  useEffect(() => {
    load().catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, [load]);

  const create = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/admin/customers', {
        method: 'POST',
        body: { full_name: form.full_name, phone: form.phone, email: form.email || undefined },
      });
      setForm({ full_name: '', phone: '', email: '' });
      setMsg('✔ Client ajouté');
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
          <input required minLength={2} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>
        <label>
          Téléphone
          <input required pattern="^\+?[0-9]{8,15}$" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label>
          Email (optionnel)
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <button className="btn primary">Ajouter</button>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Créé le</th>
              <th>Absences</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.full_name}</td>
                <td>{c.phone}</td>
                <td>{c.email ?? '—'}</td>
                <td>{fmtDateTime(c.created_at)}</td>
                <td>
                  {c.no_show_count ?? 0}
                  {c.flagged_at && <span className="chip cancelled" style={{ marginLeft: 6 }}>⚠ signalé</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  Aucun client.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Réservations (admin) ───────────────────────────────────────────────────────

function ReservationsTab() {
  const [rows, setRows] = useState<AdminReservationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async (status: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    setRows((await api<{ reservations: AdminReservationRow[] }>(`/api/admin/reservations${q}`)).reservations);
  }, []);

  useEffect(() => {
    load(statusFilter).catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, [load, statusFilter]);

  const act = async (id: string, action: 'confirm' | 'cancel'): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/reservations/${id}/${action}`, { method: 'POST', body: {} });
      setMsg(action === 'confirm' ? '✔ Réservation confirmée' : '✔ Réservation annulée');
      await load(statusFilter);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && <p className="alert info">{msg}</p>}
      <div className="form-inline select-row">
        <label>
          Filtrer par statut
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tous</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmée</option>
            <option value="completed">Terminée</option>
            <option value="cancelled">Annulée</option>
            <option value="no_show">Absence (no-show)</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Client</th>
              <th>Voyage</th>
              <th>Départ</th>
              <th>Places</th>
              <th>Total</th>
              <th>Payé</th>
              <th>Solde</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.code}</td>
                <td>
                  {r.customer_name}
                  <div className="muted small">{r.customer_phone}</div>
                </td>
                <td>{r.trip_code}</td>
                <td>{fmtDateTime(r.departure_at)}</td>
                <td>{r.seats}</td>
                <td>
                  {Number(r.total_price).toLocaleString('fr-DZ')} {r.currency}
                </td>
                <td>{Number(r.amount_paid).toLocaleString('fr-DZ')}</td>
                <td>{Number(r.balance_due).toLocaleString('fr-DZ')}</td>
                <td>
                  <span className={`chip ${r.status}`}>{r.status}</span>
                </td>
                <td className="actions">
                  {r.status === 'pending' && (
                    <button className="btn primary small" onClick={() => void act(r.id, 'confirm')}>
                      Confirmer
                    </button>
                  )}
                  {(r.status === 'pending' || r.status === 'confirmed') && (
                    <button className="btn danger small" onClick={() => void act(r.id, 'cancel')}>
                      Annuler
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="empty">
                  Aucune réservation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Paiements ────────────────────────────────────────────────────────────────

function PaymentsTab() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [worklist, setWorklist] = useState<RefundWorklistRow[]>([]);
  const [reservations, setReservations] = useState<AdminReservationRow[]>([]);
  const [form, setForm] = useState({ reservation_id: '', amount: '', method: 'cash', reference: '' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [p, wl, res] = await Promise.all([
      api<{ payments: PaymentRow[] }>('/api/admin/payments'),
      api<{ worklist: RefundWorklistRow[] }>('/api/admin/refunds-worklist'),
      api<{ reservations: AdminReservationRow[] }>('/api/admin/reservations'),
    ]);
    setRows(p.payments);
    setWorklist(wl.worklist);
    setReservations(res.reservations);
  }, []);

  useEffect(() => {
    load().catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, [load]);

  const record = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/admin/payments', {
        method: 'POST',
        body: {
          reservation_id: form.reservation_id,
          amount: Number(form.amount),
          method: form.method,
          reference: form.reference || undefined,
        },
      });
      setMsg('✔ Paiement enregistré (en attente)');
      setForm({ reservation_id: '', amount: '', method: 'cash', reference: '' });
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const settle = async (id: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/payments/${id}/settle`, { method: 'POST', body: {} });
      setMsg('✔ Paiement encaissé');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const refund = async (id: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/payments/${id}/refund`, { method: 'POST', body: {} });
      setMsg('✔ Remboursement effectué');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && <p className="alert info">{msg}</p>}
      <form className="card form-grid" onSubmit={(e) => void record(e)}>
        <label>
          Réservation
          <select required value={form.reservation_id} onChange={(e) => setForm({ ...form, reservation_id: e.target.value })}>
            <option value="">—</option>
            {reservations
              .filter((r) => r.status !== 'cancelled')
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.customer_name} (solde {Number(r.balance_due).toLocaleString('fr-DZ')} {r.currency})
                </option>
              ))}
          </select>
        </label>
        <label>
          Montant (DZD)
          <input type="number" min={1} step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </label>
        <label>
          Méthode
          <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="cash">Espèces</option>
            <option value="cib">CIB</option>
            <option value="edahabia">Edahabia</option>
            <option value="bank_transfer">Virement</option>
            <option value="card">Carte</option>
          </select>
        </label>
        <label>
          Référence (optionnel)
          <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </label>
        <button className="btn primary">Enregistrer le paiement</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Réservation</th>
              <th>Client</th>
              <th>Montant</th>
              <th>Remboursé</th>
              <th>Méthode</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.code}</td>
                <td>{p.reservation_code}</td>
                <td>{p.customer_name}</td>
                <td>
                  {Number(p.amount).toLocaleString('fr-DZ')} {p.currency}
                </td>
                <td>{Number(p.refunded_amount).toLocaleString('fr-DZ')}</td>
                <td>{p.method}</td>
                <td>
                  <span className={`chip ${p.status}`}>{p.status}</span>
                </td>
                <td className="actions">
                  {p.status === 'pending' && (
                    <button className="btn primary small" onClick={() => void settle(p.id)}>
                      Encaisser
                    </button>
                  )}
                  {(p.status === 'paid' || p.status === 'partially_refunded') && (
                    <button className="btn ghost small" onClick={() => void refund(p.id)}>
                      Rembourser
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  Aucun paiement.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>
        Remboursements en attente
        {worklist.length > 0 && <span className="tab-badge">{worklist.length}</span>}
      </h2>
      <p className="muted small">
        Réservations annulées dont au moins un paiement n'a pas encore été intégralement remboursé — distinct des
        paiements déjà remboursés (colonne « Remboursé » ci-dessus). Chaque ligne agit directement sur le paiement
        concerné.
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Paiement</th>
              <th>Réservation</th>
              <th>Voyage</th>
              <th>Client</th>
              <th>Téléphone</th>
              <th>Payé</th>
              <th>Déjà remboursé</th>
              <th>Reste à rembourser</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {worklist.map((w) => (
              <tr key={w.payment_id}>
                <td>{w.payment_code}</td>
                <td>{w.reservation_code}</td>
                <td>
                  {w.trip_code} — {fmtDateTime(w.departure_at)}
                </td>
                <td>{w.customer_name}</td>
                <td>{w.customer_phone}</td>
                <td>{Number(w.amount).toLocaleString('fr-DZ')} DZD</td>
                <td>{Number(w.refunded_amount).toLocaleString('fr-DZ')} DZD</td>
                <td>
                  <strong>{Number(w.refund_due).toLocaleString('fr-DZ')} DZD</strong>
                </td>
                <td className="actions">
                  <button className="btn primary small" onClick={() => void refund(w.payment_id)}>
                    Rembourser
                  </button>
                </td>
              </tr>
            ))}
            {worklist.length === 0 && (
              <tr>
                <td colSpan={9} className="empty">
                  Aucun remboursement en attente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Suivi GPS ────────────────────────────────────────────────────────────────

function TrackingTab() {
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [form, setForm] = useState({ kind: 'driver' as 'driver' | 'vehicle', target_id: '', gps_lat: '', gps_lon: '' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [t, d, v] = await Promise.all([
      api<{ tracking: TrackingRow[] }>('/api/admin/tracking'),
      api<{ drivers: DriverRow[] }>('/api/admin/drivers'),
      api<{ vehicles: VehicleRow[] }>('/api/admin/vehicles'),
    ]);
    setRows(t.tracking);
    setDrivers(d.drivers);
    setVehicles(v.vehicles);
  }, []);

  useEffect(() => {
    load().catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, [load]);

  const push = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      const path = form.kind === 'driver' ? `/api/admin/drivers/${form.target_id}/location` : `/api/admin/vehicles/${form.target_id}/location`;
      await api(path, { method: 'POST', body: { gps_lat: Number(form.gps_lat), gps_lon: Number(form.gps_lon) } });
      setMsg('✔ Position mise à jour');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && <p className="alert info">{msg}</p>}
      <form className="card form-grid" onSubmit={(e) => void push(e)}>
        <label>
          Type
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as 'driver' | 'vehicle', target_id: '' })}>
            <option value="driver">Chauffeur</option>
            <option value="vehicle">Véhicule</option>
          </select>
        </label>
        <label>
          Cible
          <select required value={form.target_id} onChange={(e) => setForm({ ...form, target_id: e.target.value })}>
            <option value="">—</option>
            {(form.kind === 'driver' ? drivers : vehicles).map((x) => (
              <option key={x.id} value={x.id}>
                {'full_name' in x ? x.full_name : x.matricule}
              </option>
            ))}
          </select>
        </label>
        <label>
          Latitude
          <input type="number" step="0.000001" min={-90} max={90} required value={form.gps_lat} onChange={(e) => setForm({ ...form, gps_lat: e.target.value })} />
        </label>
        <label>
          Longitude
          <input type="number" step="0.000001" min={-180} max={180} required value={form.gps_lon} onChange={(e) => setForm({ ...form, gps_lon: e.target.value })} />
        </label>
        <button className="btn primary">Mettre à jour la position</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Nom</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Relevé le</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.kind === 'driver' ? 'Chauffeur' : 'Véhicule'}</td>
                <td>{r.kind === 'driver' ? r.driver_name : r.vehicle_matricule}</td>
                <td>{r.gps_lat}</td>
                <td>{r.gps_lon}</td>
                <td>{r.recorded_at ? fmtDateTime(r.recorded_at) : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  Aucune position connue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Codes erreurs (référence) ───────────────────────────────────────────────

function ErrorsTab() {
  const [rows, setRows] = useState<DomainErrorRow[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<{ errors: DomainErrorRow[] }>('/api/registry/errors')
      .then((r) => setRows(r.errors))
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div>
      {msg && <p className="alert error">{msg}</p>}
      <p className="muted">Catalogue des erreurs métier renvoyées par la base (code SQLSTATE = DZxxx).</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sqlstate}>
                <td>
                  <span className="chip">{r.sqlstate}</span>
                </td>
                <td>{r.code_name}</td>
                <td>{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Absences (no-show strikes — Task 5.3) ───────────────────────────────────

function NoShowTab() {
  const [events, setEvents] = useState<NoShowEventRow[]>([]);
  const [kindFilter, setKindFilter] = useState<'' | 'customer' | 'driver'>('');
  const [threshold, setThreshold] = useState<number | null>(null);
  const [thresholdInput, setThresholdInput] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async (kind: '' | 'customer' | 'driver') => {
    try {
      const qs = kind ? `?kind=${kind}` : '';
      const [e, t] = await Promise.all([
        api<{ events: NoShowEventRow[] }>(`/api/admin/no-show-events${qs}`),
        api<{ value: number }>('/api/admin/settings/no-show-threshold'),
      ]);
      setEvents(e.events);
      setThreshold(t.value);
      setThresholdInput(String(t.value));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load(kindFilter);
  }, [load, kindFilter]);

  const saveThreshold = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/admin/settings/no-show-threshold', { method: 'PUT', body: { value: Number(thresholdInput) } });
      setMsg('✔ Seuil mis à jour');
      await load(kindFilter);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      <p className="muted">
        Chaque absence (client non présenté au point de montée, ou conducteur n'ayant pas démarré son voyage) est
        enregistrée ici. Au-delà du seuil, le compte concerné est marqué « signalé » dans les onglets Chauffeurs /
        Clients — à charge pour un administrateur de décider d'une suite (aucun blocage automatique).
      </p>
      {msg && <p className="alert info">{msg}</p>}
      <form className="card form-grid" onSubmit={(e) => void saveThreshold(e)} style={{ maxWidth: 320 }}>
        <label>
          Seuil de signalement (nombre d'absences)
          {threshold !== null && (
            <input type="number" min={1} required value={thresholdInput} onChange={(e) => setThresholdInput(e.target.value)} />
          )}
        </label>
        <button className="btn primary">Enregistrer le seuil</button>
      </form>

      <div style={{ margin: '12px 0' }}>
        <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as '' | 'customer' | 'driver')}>
          <option value="">Tous</option>
          <option value="customer">Clients</option>
          <option value="driver">Chauffeurs</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Personne</th>
              <th>Voyage</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>{fmtDateTime(ev.recorded_at)}</td>
                <td>{ev.kind === 'customer' ? 'Client' : 'Chauffeur'}</td>
                <td>{ev.kind === 'customer' ? ev.customer_name : ev.driver_name}</td>
                <td>{ev.trip_code ?? '—'}</td>
                <td>{ev.notes ?? '—'}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  Aucune absence enregistrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── KYC chauffeurs (Task 6.1) ────────────────────────────────────────────────

function KycReviewTab() {
  const [docs, setDocs] = useState<KycDocumentRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<'' | KycDocumentRow['status']>('pending');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: '' | KycDocumentRow['status']) => {
    try {
      const qs = status ? `?status=${status}` : '';
      setDocs((await api<{ documents: KycDocumentRow[] }>(`/api/admin/kyc${qs}`)).documents);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load(statusFilter);
  }, [load, statusFilter]);

  const approve = async (id: string): Promise<void> => {
    setBusyId(id);
    setMsg('');
    try {
      await api(`/api/admin/kyc/${id}/approve`, { method: 'POST', body: {} });
      setMsg('✔ Document approuvé');
      await load(statusFilter);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string): Promise<void> => {
    const reason = window.prompt('Motif du refus :', '');
    if (!reason) return;
    setBusyId(id);
    setMsg('');
    try {
      await api(`/api/admin/kyc/${id}/reject`, { method: 'POST', body: { reason } });
      setMsg('✔ Document refusé');
      await load(statusFilter);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <p className="muted">File de vérification des documents KYC envoyés par les chauffeurs (identité, permis, carte grise, assurance).</p>
      {msg && <p className="alert info">{msg}</p>}
      <div style={{ margin: '12px 0' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | KycDocumentRow['status'])}>
          <option value="pending">En attente</option>
          <option value="approved">Approuvés</option>
          <option value="rejected">Refusés</option>
          <option value="">Tous</option>
        </select>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Chauffeur</th>
              <th>Type</th>
              <th>Envoyé le</th>
              <th>Fichier</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td>{d.driver_name}</td>
                <td>{KYC_DOC_LABEL[d.doc_type]}</td>
                <td>{fmtDateTime(d.submitted_at)}</td>
                <td>
                  <a href={fileUrl(`/api/admin/kyc/${d.id}/file`)} target="_blank" rel="noreferrer">
                    voir
                  </a>
                </td>
                <td>
                  <span className={`chip ${d.status === 'approved' ? 'confirmed' : d.status === 'rejected' ? 'cancelled' : 'pending'}`}>
                    {d.status}
                  </span>
                  {d.status === 'rejected' && d.rejection_reason && <div className="muted small">{d.rejection_reason}</div>}
                </td>
                <td className="actions">
                  {d.status === 'pending' && (
                    <>
                      <button className="btn primary small" disabled={busyId === d.id} onClick={() => void approve(d.id)}>
                        Approuver
                      </button>
                      <button className="btn danger small" disabled={busyId === d.id} onClick={() => void reject(d.id)}>
                        Refuser
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  Aucun document.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
