import { Fragment, useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, fileUrl, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import WpointManager from '../components/WpointManager';
import type {
  AdminReservationRow,
  CustomerRow,
  DomainErrorRow,
  DriverEarningsSummary,
  DriverRow,
  FraudSignalRow,
  KycDocType,
  KycDocumentRow,
  MaintenanceStatus,
  NoShowEventRow,
  PaymentGatewayEventRow,
  PaymentRow,
  PayoutBatchRow,
  PayoutLedgerRow,
  PromoCodeRow,
  RatingRow,
  RefundWorklistRow,
  TrackingRow,
  TrajectoryRow,
  VehicleInspectionRow,
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
  | 'promo-codes'
  | 'payouts'
  | 'tracking'
  | 'no-show'
  | 'kyc'
  | 'vehicle-inspections'
  | 'ratings'
  | 'fraud'
  | 'errors';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'trips', label: 'Voyages' },
  { id: 'trajectories', label: 'Trajectoires' },
  { id: 'drivers', label: 'Chauffeurs' },
  { id: 'vehicles', label: 'Véhicules' },
  { id: 'customers', label: 'Clients' },
  { id: 'reservations', label: 'Réservations' },
  { id: 'payments', label: 'Paiements' },
  { id: 'promo-codes', label: 'Codes promo' },
  { id: 'payouts', label: 'Versements chauffeurs' },
  { id: 'tracking', label: 'Suivi GPS' },
  { id: 'no-show', label: 'Absences' },
  { id: 'kyc', label: 'KYC chauffeurs' },
  { id: 'vehicle-inspections', label: 'Contrôles techniques' },
  { id: 'ratings', label: 'Évaluations' },
  { id: 'fraud', label: 'Fraude' },
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
      {tab === 'promo-codes' && <PromoCodesTab />}
      {tab === 'payouts' && <PayoutsTab />}
      {tab === 'tracking' && <TrackingTab />}
      {tab === 'no-show' && <NoShowTab />}
      {tab === 'kyc' && <KycReviewTab />}
      {tab === 'vehicle-inspections' && <VehicleInspectionReviewTab />}
      {tab === 'ratings' && <RatingsModerationTab />}
      {tab === 'fraud' && <FraudSignalsTab />}
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
              <th>Évaluation</th>
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
                    {d.rating_count ? `★ ${Number(d.rating_avg).toFixed(1)} (${d.rating_count})` : '—'}
                    {d.trust_badge && <span className="chip confirmed" style={{ marginLeft: 6 }}>✔ confiance</span>}
                  </td>
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
                    <td colSpan={6}>
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
              <th>Contrôle technique</th>
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
                  {v.is_eligible ? (
                    <span className="chip confirmed">✔ éligible</span>
                  ) : (
                    <span className="chip cancelled" title="Aucun contrôle technique approuvé et valide — ce véhicule ne pourra pas être affecté à un voyage publié">
                      ⚠ non éligible
                    </span>
                  )}
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
              <th>Évaluation</th>
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
                <td>{c.rating_count ? `★ ${Number(c.rating_avg).toFixed(1)} (${c.rating_count})` : '—'}</td>
                <td>
                  {c.no_show_count ?? 0}
                  {c.flagged_at && <span className="chip cancelled" style={{ marginLeft: 6 }}>⚠ signalé</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
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

  const retryRefund = async (refundId: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/refunds/${refundId}/retry`, { method: 'POST', body: {} });
      setMsg('✔ Nouvelle tentative de remboursement lancée');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const failRefund = async (refundId: string): Promise<void> => {
    const reason = window.prompt('Raison de l\u2019échec ?', 'Échec manuel (admin)');
    if (reason === null) return;
    setMsg('');
    try {
      await api(`/api/admin/refunds/${refundId}/fail`, { method: 'POST', body: { reason } });
      setMsg('✔ Remboursement marqué comme échoué');
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
              <th>Origine</th>
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
                <td>{p.gateway ? <span className="chip pending">en ligne ({p.gateway})</span> : 'manuel'}</td>
                <td>
                  <span className={`chip ${p.status}`}>{p.status}</span>
                  {p.status === 'failed' && p.failure_reason && <div className="muted small">{p.failure_reason}</div>}
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
                <td colSpan={9} className="empty">
                  Aucun paiement.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaymentGatewayEventsPanel />

      <h2>
        Registre des remboursements (Task 7.4)
        {worklist.filter((w) => w.status === 'pending' || w.status === 'failed').length > 0 && (
          <span className="tab-badge">{worklist.filter((w) => w.status === 'pending' || w.status === 'failed').length}</span>
        )}
      </h2>
      <p className="muted small">
        Un remboursement est calculé automatiquement selon la politique d'annulation (délai avant départ) et exécuté
        via la passerelle de paiement — chaque ligne est une tentative (succès, échec, ou en attente), jamais réécrite
        après coup, pour conserver l'historique complet. Un échec peut être réessayé ci-dessous.
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Paiement</th>
              <th>Réservation</th>
              <th>Voyage</th>
              <th>Client</th>
              <th>Montant</th>
              <th>Politique</th>
              <th>Origine</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {worklist.map((w) => (
              <tr key={w.refund_id}>
                <td>{w.payment_code}</td>
                <td>{w.reservation_code}</td>
                <td>
                  {w.trip_code} — {fmtDateTime(w.departure_at)}
                </td>
                <td>
                  {w.customer_name}
                  <div className="muted small">{w.customer_phone}</div>
                </td>
                <td>{Number(w.amount).toLocaleString('fr-DZ')} DZD</td>
                <td>{w.policy_pct !== null ? `${w.policy_pct}%` : '—'}</td>
                <td>{w.initiated_by === 'system' ? 'automatique' : 'admin'}</td>
                <td>
                  <span className={`chip ${w.status}`}>{w.status}</span>
                  {w.status === 'failed' && w.failure_reason && <div className="muted small">{w.failure_reason}</div>}
                </td>
                <td className="actions">
                  {w.status === 'failed' && (
                    <button className="btn primary small" onClick={() => void retryRefund(w.refund_id)}>
                      Réessayer
                    </button>
                  )}
                  {(w.status === 'pending' || w.status === 'processing') && (
                    <button className="btn ghost small" onClick={() => void failRefund(w.refund_id)}>
                      Marquer échoué
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {worklist.length === 0 && (
              <tr>
                <td colSpan={9} className="empty">
                  Aucun remboursement enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Codes promo (Task 9.2) ───────────────────────────────────────────────────

function PromoCodesTab() {
  const [rows, setRows] = useState<PromoCodeRow[]>([]);
  const [form, setForm] = useState({
    code: '',
    discount_type: 'fixed' as 'fixed' | 'percentage',
    discount_value: '',
    min_amount: '0',
    max_uses_total: '',
    max_uses_per_customer: '1',
    starts_at: '',
    expires_at: '',
  });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setRows((await api<{ promo_codes: PromoCodeRow[] }>('/api/admin/promo-codes')).promo_codes);
  }, []);

  useEffect(() => {
    load().catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, [load]);

  const create = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/admin/promo-codes', {
        method: 'POST',
        body: {
          code: form.code.trim().toUpperCase(),
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          min_amount: form.min_amount ? Number(form.min_amount) : undefined,
          max_uses_total: form.max_uses_total ? Number(form.max_uses_total) : null,
          max_uses_per_customer: Number(form.max_uses_per_customer || 1),
          starts_at: form.starts_at || null,
          expires_at: form.expires_at || null,
        },
      });
      setMsg('✔ Code promo créé');
      setForm({ ...form, code: '', discount_value: '' });
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const toggle = async (id: string, active: boolean): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/promo-codes/${id}/${active ? 'deactivate' : 'activate'}`, { method: 'POST', body: {} });
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
          Code
          <input required minLength={3} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </label>
        <label>
          Type
          <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'fixed' | 'percentage' })}>
            <option value="fixed">Montant fixe (DZD)</option>
            <option value="percentage">Pourcentage (%)</option>
          </select>
        </label>
        <label>
          Valeur
          <input
            type="number"
            min={0.01}
            step="0.01"
            required
            value={form.discount_value}
            onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
          />
        </label>
        <label>
          Montant minimum (DZD)
          <input type="number" min={0} step="0.01" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} />
        </label>
        <label>
          Utilisations max. (total, vide = illimité)
          <input
            type="number"
            min={1}
            value={form.max_uses_total}
            onChange={(e) => setForm({ ...form, max_uses_total: e.target.value })}
          />
        </label>
        <label>
          Utilisations max. par client
          <input
            type="number"
            min={1}
            value={form.max_uses_per_customer}
            onChange={(e) => setForm({ ...form, max_uses_per_customer: e.target.value })}
          />
        </label>
        <label>
          Début (optionnel)
          <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
        </label>
        <label>
          Expiration (optionnel)
          <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
        </label>
        <button className="btn primary">Créer le code</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Valeur</th>
              <th>Min.</th>
              <th>Usages (total / par client)</th>
              <th>Fenêtre</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.code}</strong>
                </td>
                <td>{p.discount_type === 'fixed' ? 'Montant fixe' : 'Pourcentage'}</td>
                <td>{p.discount_type === 'fixed' ? `${Number(p.discount_value).toLocaleString('fr-DZ')} DZD` : `${p.discount_value}%`}</td>
                <td>{Number(p.min_amount).toLocaleString('fr-DZ')} DZD</td>
                <td>
                  {p.max_uses_total ?? '∞'} / {p.max_uses_per_customer}
                </td>
                <td className="muted small">
                  {p.starts_at ? fmtDateTime(p.starts_at) : '—'} → {p.expires_at ? fmtDateTime(p.expires_at) : '—'}
                </td>
                <td>
                  <span className={`chip ${p.active ? 'active' : 'inactive'}`}>{p.active ? 'actif' : 'inactif'}</span>
                </td>
                <td className="actions">
                  <button className="btn ghost small" onClick={() => void toggle(p.id, p.active)}>
                    {p.active ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  Aucun code promo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Versements chauffeurs (Task 8.1 / 8.2 / 8.3) ─────────────────────────────

function PayoutsTab() {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [driverId, setDriverId] = useState('');
  const [summary, setSummary] = useState<DriverEarningsSummary | null>(null);
  const [ledger, setLedger] = useState<PayoutLedgerRow[]>([]);
  const [batches, setBatches] = useState<PayoutBatchRow[]>([]);
  const [batchForm, setBatchForm] = useState({ period_start: '', period_end: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<{ drivers: DriverRow[] }>('/api/admin/drivers')
      .then((d) => setDrivers(d.drivers))
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, []);

  const loadDriver = useCallback(async (id: string) => {
    if (!id) {
      setSummary(null);
      setLedger([]);
      setBatches([]);
      return;
    }
    const [s, l, b] = await Promise.all([
      api<{ summary: DriverEarningsSummary }>(`/api/admin/drivers/${id}/earnings`),
      api<{ ledger: PayoutLedgerRow[] }>(`/api/admin/drivers/${id}/earnings/ledger`),
      api<{ batches: PayoutBatchRow[] }>(`/api/admin/payout-batches?driver_id=${id}`),
    ]);
    setSummary(s.summary);
    setLedger(l.ledger);
    setBatches(b.batches);
  }, []);

  useEffect(() => {
    loadDriver(driverId).catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, [driverId, loadDriver]);

  const createBatch = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!driverId) return;
    setMsg('');
    try {
      await api('/api/admin/payout-batches', {
        method: 'POST',
        body: { driver_id: driverId, period_start: batchForm.period_start, period_end: batchForm.period_end },
      });
      setMsg('✔ Batch de versement créé');
      await loadDriver(driverId);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const markPaid = async (batchId: string): Promise<void> => {
    const reference = window.prompt('Référence du virement / paiement ?');
    if (!reference) return;
    setMsg('');
    try {
      await api(`/api/admin/payout-batches/${batchId}/mark-paid`, { method: 'POST', body: { reference } });
      setMsg('✔ Versement marqué comme payé');
      await loadDriver(driverId);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && <p className="alert info">{msg}</p>}
      <label>
        Chauffeur
        <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          <option value="">— choisir —</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name} ({d.phone})
            </option>
          ))}
        </select>
      </label>

      {driverId && summary && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '14px 0' }}>
            {([
              ['Revenu brut', summary.gross_revenue, true],
              ['Commission', summary.commission, false],
              ['Remboursements', summary.refunds, false],
              ['Revenu net', summary.net_earnings, true],
              ['En attente', summary.pending_payout, true],
              ['Déjà versé', summary.paid_out, true],
            ] as Array<[string, string, boolean]>).map(([label, value, positive]) => (
              <div className="card" key={label} style={{ minWidth: 150 }}>
                <p className="muted small" style={{ margin: 0 }}>
                  {label}
                </p>
                <p className={positive ? 'positive' : 'negative'} style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                  {Number(value).toLocaleString('fr-DZ')} DZD
                </p>
              </div>
            ))}
          </div>

          <form className="form-inline" onSubmit={(e) => void createBatch(e)}>
            <label>
              Début période
              <input
                type="datetime-local"
                required
                value={batchForm.period_start}
                onChange={(e) => setBatchForm({ ...batchForm, period_start: e.target.value })}
              />
            </label>
            <label>
              Fin période
              <input
                type="datetime-local"
                required
                value={batchForm.period_end}
                onChange={(e) => setBatchForm({ ...batchForm, period_end: e.target.value })}
              />
            </label>
            <button className="btn primary small">Créer un batch de versement</button>
          </form>

          <h3>Batches</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Référence</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td>
                      {fmtDateTime(b.period_start)} → {fmtDateTime(b.period_end)}
                    </td>
                    <td>{Number(b.total_amount).toLocaleString('fr-DZ')} DZD</td>
                    <td>
                      <span className={`chip ${b.status}`}>{b.status}</span>
                    </td>
                    <td>{b.reference ?? '—'}</td>
                    <td className="actions">
                      {b.status === 'pending' && (
                        <button className="btn primary small" onClick={() => void markPaid(b.id)}>
                          Marquer payé
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty">
                      Aucun batch pour ce chauffeur.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h3>Registre détaillé</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Voyage</th>
                  <th>Réservation</th>
                  <th>Net</th>
                  <th>Batch</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id}>
                    <td>{l.entry_type === 'earning' ? 'Gain' : 'Ajustement'}</td>
                    <td>{l.trip_code ?? '—'}</td>
                    <td>{l.reservation_code ?? '—'}</td>
                    <td className={Number(l.net_amount) < 0 ? 'negative' : 'positive'}>
                      {Number(l.net_amount).toLocaleString('fr-DZ')} DZD
                    </td>
                    <td>{l.payout_batch_id ? 'assigné' : '—'}</td>
                    <td>{fmtDateTime(l.created_at)}</td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      Aucune entrée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
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

// ── Paiements en ligne — journal des webhooks (Task 7.2) ────────────────────────

function PaymentGatewayEventsPanel() {
  const [events, setEvents] = useState<PaymentGatewayEventRow[]>([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setEvents((await api<{ events: PaymentGatewayEventRow[] }>('/api/admin/payment-gateway-events')).events);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return (
    <div style={{ margin: '20px 0' }}>
      <button className="btn ghost small" onClick={() => setOpen(!open)}>
        {open ? 'Masquer' : 'Afficher'} le journal des webhooks de paiement en ligne
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <p className="muted small">
            Chaque tentative de livraison d'un webhook de la passerelle de paiement (simulée) — y compris les signatures
            invalides et les livraisons en double (idempotence) — audit complet, jamais recalculé ni déduit.
          </p>
          {msg && <p className="alert info">{msg}</p>}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Reçu le</th>
                  <th>Passerelle</th>
                  <th>Événement</th>
                  <th>Signature</th>
                  <th>Résultat</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>{fmtDateTime(e.received_at)}</td>
                    <td>{e.gateway}</td>
                    <td>{e.event_type}</td>
                    <td>{e.signature_valid ? '✔' : '❌ invalide'}</td>
                    <td>
                      <span
                        className={`chip ${e.processing_result === 'processed' ? 'confirmed' : e.processing_result === 'rejected' ? 'cancelled' : 'pending'}`}
                      >
                        {e.processing_result}
                      </span>
                    </td>
                    <td className="muted small">{e.processing_note ?? '—'}</td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      Aucun événement webhook reçu pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Contrôles techniques (Task 6.2) ─────────────────────────────────────────────

const MAINTENANCE_LABEL: Record<MaintenanceStatus, string> = {
  ok: 'OK',
  needs_service: 'Entretien requis',
  out_of_service: 'Hors service',
};

function VehicleInspectionReviewTab() {
  const [rows, setRows] = useState<VehicleInspectionRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<'' | VehicleInspectionRow['approval_state']>('pending');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ vehicle_id: '', inspection_date: '', expiry_date: '', maintenance_status: 'ok' as MaintenanceStatus, notes: '' });

  const load = useCallback(async (status: '' | VehicleInspectionRow['approval_state']) => {
    try {
      const qs = status ? `?status=${status}` : '';
      const [insp, veh] = await Promise.all([
        api<{ inspections: VehicleInspectionRow[] }>(`/api/admin/vehicle-inspections${qs}`),
        api<{ vehicles: VehicleRow[] }>('/api/admin/vehicles'),
      ]);
      setRows(insp.inspections);
      setVehicles(veh.vehicles);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load(statusFilter);
  }, [load, statusFilter]);

  const create = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/admin/vehicle-inspections', {
        method: 'POST',
        body: { ...form, notes: form.notes || undefined },
      });
      setForm({ vehicle_id: '', inspection_date: '', expiry_date: '', maintenance_status: 'ok', notes: '' });
      setMsg('✔ Contrôle technique enregistré (en attente)');
      await load(statusFilter);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const approve = async (id: string): Promise<void> => {
    setBusyId(id);
    setMsg('');
    try {
      await api(`/api/admin/vehicle-inspections/${id}/approve`, { method: 'POST', body: {} });
      setMsg('✔ Contrôle technique approuvé');
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
      await api(`/api/admin/vehicle-inspections/${id}/reject`, { method: 'POST', body: { reason } });
      setMsg('✔ Contrôle technique refusé');
      await load(statusFilter);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <p className="muted">
        File de vérification des contrôles techniques de véhicules. Un voyage ne peut être publié que si son véhicule a un
        contrôle technique approuvé, non expiré, et non marqué hors service.
      </p>
      {msg && <p className="alert info">{msg}</p>}
      <form className="card form-grid" onSubmit={(e) => void create(e)}>
        <label>
          Véhicule
          <select required value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
            <option value="">—</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.matricule}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date de contrôle
          <input type="date" required value={form.inspection_date} onChange={(e) => setForm({ ...form, inspection_date: e.target.value })} />
        </label>
        <label>
          Date d'expiration
          <input type="date" required value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
        </label>
        <label>
          État d'entretien
          <select value={form.maintenance_status} onChange={(e) => setForm({ ...form, maintenance_status: e.target.value as MaintenanceStatus })}>
            <option value="ok">OK</option>
            <option value="needs_service">Entretien requis</option>
            <option value="out_of_service">Hors service</option>
          </select>
        </label>
        <label>
          Notes (optionnel)
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <button className="btn primary">Enregistrer</button>
      </form>
      <div style={{ margin: '12px 0' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | VehicleInspectionRow['approval_state'])}>
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
              <th>Véhicule</th>
              <th>Contrôle</th>
              <th>Expiration</th>
              <th>Entretien</th>
              <th>Fichier</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.vehicle_matricule}</td>
                <td>{r.inspection_date}</td>
                <td>{r.expiry_date}</td>
                <td>{MAINTENANCE_LABEL[r.maintenance_status]}</td>
                <td>
                  {r.file_path ? (
                    <a href={fileUrl(`/api/admin/vehicle-inspections/${r.id}/file`)} target="_blank" rel="noreferrer">
                      voir
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <span className={`chip ${r.approval_state === 'approved' ? 'confirmed' : r.approval_state === 'rejected' ? 'cancelled' : 'pending'}`}>
                    {r.approval_state}
                  </span>
                  {r.approval_state === 'rejected' && r.rejection_reason && <div className="muted small">{r.rejection_reason}</div>}
                </td>
                <td className="actions">
                  {r.approval_state === 'pending' && (
                    <>
                      <button className="btn primary small" disabled={busyId === r.id} onClick={() => void approve(r.id)}>
                        Approuver
                      </button>
                      <button className="btn danger small" disabled={busyId === r.id} onClick={() => void reject(r.id)}>
                        Refuser
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  Aucun contrôle technique.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Évaluations (Task 6.3) ───────────────────────────────────────────────────

function RatingsModerationTab() {
  const [rows, setRows] = useState<RatingRow[]>([]);
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows((await api<{ ratings: RatingRow[] }>('/api/admin/ratings')).ratings);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleHide = async (r: RatingRow): Promise<void> => {
    setBusyId(r.id);
    setMsg('');
    try {
      if (r.hidden_at) {
        await api(`/api/admin/ratings/${r.id}/moderate`, { method: 'POST', body: { hide: false } });
        setMsg('✔ Évaluation réaffichée');
      } else {
        const reason = window.prompt("Motif de masquage de cette évaluation :", '');
        if (!reason) {
          setBusyId(null);
          return;
        }
        await api(`/api/admin/ratings/${r.id}/moderate`, { method: 'POST', body: { hide: true, reason } });
        setMsg('✔ Évaluation masquée');
      }
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <p className="muted">
        Toutes les évaluations client ↔ chauffeur. Masquer une évaluation la retire du calcul de la moyenne affichée sans
        la supprimer (trace d'audit conservée).
      </p>
      {msg && <p className="alert info">{msg}</p>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Réservation</th>
              <th>Sens</th>
              <th>De</th>
              <th>Vers</th>
              <th>Note</th>
              <th>Avis</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.reservation_code}</td>
                <td>{r.direction === 'customer_to_driver' ? 'Client → Chauffeur' : 'Chauffeur → Client'}</td>
                <td>{r.rater_customer_name ?? r.rater_driver_name}</td>
                <td>{r.ratee_driver_name ?? r.ratee_customer_name}</td>
                <td>{'★'.repeat(r.stars)}</td>
                <td className="muted small">{r.review ?? '—'}</td>
                <td>
                  {r.hidden_at ? <span className="chip cancelled">masquée</span> : <span className="chip confirmed">visible</span>}
                  {r.hidden_at && r.moderation_reason && <div className="muted small">{r.moderation_reason}</div>}
                </td>
                <td className="actions">
                  <button className="btn ghost small" disabled={busyId === r.id} onClick={() => void toggleHide(r)}>
                    {r.hidden_at ? 'Réafficher' : 'Masquer'}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  Aucune évaluation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Fraude (Task 6.4) ────────────────────────────────────────────────────────

const FRAUD_SIGNAL_LABEL: Record<FraudSignalRow['signal_type'], string> = {
  duplicate_nin: 'NIN en double',
  duplicate_phone: 'Téléphone en double',
  rapid_cancel_rebook: 'Annulation / reréservation rapide',
  repeated_no_show: 'Absences répétées',
  suspicious_payment: 'Paiement suspect',
  account_burst: 'Création de comptes en rafale',
};

function FraudSignalsTab() {
  const [rows, setRows] = useState<FraudSignalRow[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setRows((await api<{ signals: FraudSignalRow[] }>('/api/admin/fraud-signals')).signals);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <p className="muted">
        Signaux déterministes (sans ML) calculés à la demande à partir des données existantes — NIN/téléphone en double,
        annulation puis reréservation rapide sur le même trajet, absences répétées (Task 5.3), paiements en ligne
        échoués en rafale, et créations de comptes clients en rafale. Chaque ligne est une piste à vérifier
        manuellement, pas une décision automatique.
      </p>
      {msg && <p className="alert info">{msg}</p>}
      <button className="btn ghost small" onClick={() => void load()}>
        Actualiser
      </button>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Gravité</th>
              <th>Concerné</th>
              <th>Détail</th>
              <th>Détecté le</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={i}>
                <td>{FRAUD_SIGNAL_LABEL[s.signal_type]}</td>
                <td>
                  <span className={`chip ${s.severity === 'high' ? 'cancelled' : s.severity === 'medium' ? 'pending' : 'confirmed'}`}>
                    {s.severity}
                  </span>
                </td>
                <td>{s.subject_label}</td>
                <td className="muted small">{s.detail}</td>
                <td>{fmtDateTime(s.detected_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  Aucun signal détecté pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
