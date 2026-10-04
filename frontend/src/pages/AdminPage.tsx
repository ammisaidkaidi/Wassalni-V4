import { Fragment, useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, fileUrl, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import {
  AdminsTab,
  AnalyticsTab,
  AuditLogTab,
  ExportsTab,
  ImportHistoryTab,
  RecurringTemplatesTab,
  SettingsTab,
  SosAdminTab,
  WaitlistAdminTab,
} from './AdminExtras';
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
  | 'errors'
  | 'waitlist'
  | 'recurring'
  | 'analytics'
  | 'audit-log'
  | 'import-history'
  | 'admins'
  | 'settings'
  | 'sos'
  | 'exports';

export default function AdminPage() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('trips');
  // Pending-refund count shown as a badge on the "Paiements" tab, so admins
  // notice outstanding refunds without having to open the tab first.
  const [pendingRefunds, setPendingRefunds] = useState(0);
  // Task 11.5 — open-SOS count badge, same convenience pattern as the refund badge above.
  const [openSos, setOpenSos] = useState(0);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    api<{ worklist: RefundWorklistRow[] }>('/api/admin/refunds-worklist')
      .then((r) => setPendingRefunds(r.worklist.length))
      .catch(() => {
        /* badge is a convenience — silently skip if it fails to load */
      });
    api<{ events: unknown[] }>('/api/admin/sos?status=open')
      .then((r) => setOpenSos(r.events.length))
      .catch(() => {
        /* badge is a convenience — silently skip if it fails to load */
      });
  }, [user]);

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'trips', label: t('admin.tabs.trips') },
    { id: 'trajectories', label: t('admin.tabs.trajectories') },
    { id: 'drivers', label: t('admin.tabs.drivers') },
    { id: 'vehicles', label: t('admin.tabs.vehicles') },
    { id: 'customers', label: t('admin.tabs.customers') },
    { id: 'reservations', label: t('admin.tabs.reservations') },
    { id: 'payments', label: t('admin.tabs.payments') },
    { id: 'promo-codes', label: t('admin.tabs.promoCodes') },
    { id: 'payouts', label: t('admin.tabs.payouts') },
    { id: 'tracking', label: t('admin.tabs.tracking') },
    { id: 'no-show', label: t('admin.tabs.noShow') },
    { id: 'kyc', label: t('admin.tabs.kyc') },
    { id: 'vehicle-inspections', label: t('admin.tabs.vehicleInspections') },
    { id: 'ratings', label: t('admin.tabs.ratings') },
    { id: 'fraud', label: t('admin.tabs.fraud') },
    { id: 'errors', label: t('admin.tabs.errors') },
    { id: 'waitlist', label: t('admin.tabs.waitlist') },
    { id: 'recurring', label: t('admin.tabs.recurring') },
    { id: 'analytics', label: t('admin.tabs.analytics') },
    { id: 'sos', label: t('admin.tabs.sos') },
    { id: 'audit-log', label: t('admin.tabs.auditLog') },
    { id: 'import-history', label: t('admin.tabs.importHistory') },
    { id: 'admins', label: t('admin.tabs.admins') },
    { id: 'settings', label: t('admin.tabs.settings') },
    { id: 'exports', label: t('admin.tabs.exports') },
  ];

  if (loading) return <p className="empty">{t('admin.loading')}</p>;
  if (user?.role !== 'admin')
    return (
      <p className="empty">
        <Link to="/login?next=/admin">{t('admin.loginLink')}</Link> {t('admin.loginRequired')}
      </p>
    );

  return (
    <section>
      <h1>{t('admin.title')}</h1>
      <div className="tabs">
        {TABS.map((tb) => (
          <button key={tb.id} className={`tab${tab === tb.id ? ' active' : ''}`} onClick={() => setTab(tb.id)}>
            {tb.label}
            {tb.id === 'payments' && pendingRefunds > 0 && <span className="tab-badge">{pendingRefunds}</span>}
            {tb.id === 'sos' && openSos > 0 && <span className="tab-badge">{openSos}</span>}
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
      {tab === 'waitlist' && <WaitlistAdminTab />}
      {tab === 'recurring' && <RecurringTemplatesTab />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'sos' && <SosAdminTab />}
      {tab === 'audit-log' && <AuditLogTab />}
      {tab === 'import-history' && <ImportHistoryTab />}
      {tab === 'admins' && <AdminsTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'exports' && <ExportsTab />}
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
  const { t } = useI18n();
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [trajectories, setTrajectories] = useState<TrajectoryRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [form, setForm] = useState({ trajectory_id: '', driver_id: '', vehicle_id: '', departure_at: '', capacity: '20', seat_price: '0' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [tr, tj, d, v] = await Promise.all([
      api<{ trips: TripRow[] }>('/api/admin/trips'),
      api<{ trajectories: TrajectoryRow[] }>('/api/admin/trajectories'),
      api<{ drivers: DriverRow[] }>('/api/admin/drivers'),
      api<{ vehicles: VehicleRow[] }>('/api/admin/vehicles'),
    ]);
    setTrips(tr.trips);
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
      setMsg(t('admin.trips.created'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const act = async (id: string, action: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/trips/${id}/${action}`, { method: 'POST', body: {} });
      setMsg(t('admin.trips.actionOk', { action }));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  // Task 5.3 — the driver never started a scheduled trip: record the strike
  // (flag-only — see NoShowTab) and cancel the trip since it can't proceed.
  const reportDriverNoShow = async (id: string): Promise<void> => {
    if (!confirm(t('admin.trips.noShowConfirm'))) return;
    const notes = window.prompt(t('admin.trips.noShowNotePrompt'), '') ?? undefined;
    setMsg('');
    try {
      await api(`/api/admin/trips/${id}/driver-no-show`, { method: 'POST', body: { notes } });
      setMsg(t('admin.trips.noShowRecorded'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="card form-grid" onSubmit={(e) => void create(e)}>
        <label htmlFor="admin-trip-trajectory">
          {t('admin.trips.trajectoryLabel')}
          <select
            id="admin-trip-trajectory"
            required
            value={form.trajectory_id}
            onChange={(e) => setForm({ ...form, trajectory_id: e.target.value })}
          >
            <option value="">{t('admin.common.pickOption')}</option>
            {trajectories.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="admin-trip-driver">
          {t('admin.trips.driverLabel')}
          <select id="admin-trip-driver" value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })}>
            <option value="">{t('admin.common.pickOption')}</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="admin-trip-vehicle">
          {t('admin.trips.vehicleLabel')}
          <select id="admin-trip-vehicle" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
            <option value="">{t('admin.common.pickOption')}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {t('admin.trips.vehicleOption', { matricule: v.matricule, seats: v.seats })}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="admin-trip-departure">
          {t('admin.common.departure')}
          <input
            id="admin-trip-departure"
            type="datetime-local"
            required
            value={form.departure_at}
            onChange={(e) => setForm({ ...form, departure_at: e.target.value })}
          />
        </label>
        <label htmlFor="admin-trip-capacity">
          {t('admin.common.capacity')}
          <input
            id="admin-trip-capacity"
            type="number"
            min={1}
            required
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
        </label>
        <label htmlFor="admin-trip-seat-price">
          {t('admin.common.fallbackPrice')}
          <input
            id="admin-trip-seat-price"
            type="number"
            min={0}
            step="0.01"
            value={form.seat_price}
            onChange={(e) => setForm({ ...form, seat_price: e.target.value })}
          />
        </label>
        <button className="btn primary">{t('admin.common.createTrip')}</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.code')}</th>
              <th>{t('admin.common.trajectory')}</th>
              <th>{t('admin.common.departure')}</th>
              <th>{t('admin.common.seats')}</th>
              <th>{t('admin.trips.seatsCol')}</th>
              <th>{t('admin.common.status')}</th>
              <th>{t('admin.common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((tr) => (
              <tr key={tr.id}>
                <td>{tr.code}</td>
                <td>{tr.trajectory_name}</td>
                <td>{fmtDateTime(tr.departure_at)}</td>
                <td>
                  {tr.seats_available ?? '—'}/{tr.capacity}
                </td>
                <td>{String(tr.nb_active_reservations)}</td>
                <td>
                  <span className={`chip ${tr.status}`}>{t(`status.trip.${tr.status}`)}</span>
                  {!tr.published_at && <span className="chip draft">{t('admin.trips.notPublished')}</span>}
                </td>
                <td className="actions">
                  <button className="btn ghost small" onClick={() => void act(tr.id, 'stops')}>
                    {t('admin.trips.stops')}
                  </button>
                  {!tr.published_at && (
                    <button className="btn primary small" onClick={() => void act(tr.id, 'publish')}>
                      {t('admin.trips.publish')}
                    </button>
                  )}
                  <button className="btn ghost small" onClick={() => void act(tr.id, 'prices/populate')}>
                    {t('admin.trips.defaultPriceAction')}
                  </button>
                  {tr.status === 'scheduled' && tr.published_at && (
                    <button className="btn primary small" onClick={() => void act(tr.id, 'start')}>
                      {t('admin.trips.start')}
                    </button>
                  )}
                  {tr.status === 'in_progress' && (
                    <button className="btn primary small" onClick={() => void act(tr.id, 'close')}>
                      {t('admin.trips.close')}
                    </button>
                  )}
                  {(tr.status === 'scheduled' || tr.status === 'in_progress') && (
                    <button className="btn danger small" onClick={() => void act(tr.id, 'cancel')}>
                      {t('admin.trips.cancel')}
                    </button>
                  )}
                  {tr.status === 'scheduled' && (
                    <button className="btn danger small" onClick={() => void reportDriverNoShow(tr.id)}>
                      {t('admin.trips.driverNoShow')}
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
  const { t } = useI18n();
  const [rows, setRows] = useState<TrajectoryRow[]>([]);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [wpoints, setWpoints] = useState<WpointRow[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState({ from: '', to: '', amount: '' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [tr, w] = await Promise.all([
      api<{ trajectories: TrajectoryRow[] }>('/api/admin/trajectories'),
      api<{ wilayas: Wilaya[] }>('/api/registry/wilayas'),
    ]);
    setRows(tr.trajectories);
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
      setMsg(t('admin.trajectories.trajectoryCreated'));
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
      setMsg(t('admin.trajectories.defaultPriceSaved'));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="card form-inline" onSubmit={(e) => void create(e)}>
        <label htmlFor="admin-new-trajectory">
          {t('admin.common.newTrajectory')}
          <input
            id="admin-new-trajectory"
            required
            minLength={2}
            placeholder={t('admin.trajectories.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button className="btn primary">{t('admin.common.create')}</button>
      </form>

      <div className="form-inline select-row">
        <label htmlFor="admin-trajectory-select">
          {t('admin.common.manage')}
          <select id="admin-trajectory-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">{t('admin.common.pickTrajectory')}</option>
            {rows.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.name} ({t('admin.common.stopsCount', { n: tr.nb_wpoints })})
              </option>
            ))}
          </select>
        </label>
      </div>

      {selected && (
        <div className="detail-grid">
          <div className="card">
            <h2>{t('admin.common.stopsTitle')}</h2>
            <WpointManager basePath="/api/admin" trajectoryId={selected} wilayas={wilayas} onWpointsChange={setWpoints} />
          </div>

          <div className="card">
            <h2>{t('admin.common.defaultPriceTitle')}</h2>
            <form className="form-grid" onSubmit={(e) => void setDefaultPrice(e)}>
              <label htmlFor="admin-price-from">
                {t('admin.common.from')}
                <select id="admin-price-from" required value={price.from} onChange={(e) => setPrice({ ...price, from: e.target.value })}>
                  <option value="">{t('admin.common.pickOption')}</option>
                  {wpoints.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nom_fr}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="admin-price-to">
                {t('admin.common.to')}
                <select id="admin-price-to" required value={price.to} onChange={(e) => setPrice({ ...price, to: e.target.value })}>
                  <option value="">{t('admin.common.pickOption')}</option>
                  {wpoints.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nom_fr}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="admin-price-amount">
                {t('admin.common.price')} (DZD)
                <input
                  id="admin-price-amount"
                  type="number"
                  min={0}
                  required
                  value={price.amount}
                  onChange={(e) => setPrice({ ...price, amount: e.target.value })}
                />
              </label>
              <button className="btn primary">{t('admin.common.save')}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chauffeurs ───────────────────────────────────────────────────────────────

function DriversTab() {
  const { t } = useI18n();
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
      setMsg(t('admin.drivers.added'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const remove = async (id: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/drivers/${id}`, { method: 'DELETE' });
      setMsg(t('admin.common.deleted'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="card form-grid" onSubmit={(e) => void create(e)}>
        <label htmlFor="admin-driver-name">
          {t('admin.common.fullName')}
          <input id="admin-driver-name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>
        <label htmlFor="admin-driver-nin">
          {t('admin.drivers.ninLabel')}
          <input id="admin-driver-nin" required pattern="\d{18}" value={form.nin} onChange={(e) => setForm({ ...form, nin: e.target.value })} />
        </label>
        <label htmlFor="admin-driver-phone">
          {t('admin.common.phone')}
          <input
            id="admin-driver-phone"
            required
            pattern="^\+?[0-9]{8,15}$"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        <button className="btn primary">{t('admin.common.add')}</button>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.name')}</th>
              <th>NIN</th>
              <th>{t('admin.common.phone')}</th>
              <th>{t('admin.drivers.rating')}</th>
              <th>{t('admin.drivers.noShows')}</th>
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
                    {d.trust_badge && (
                      <span className="chip confirmed" style={{ marginLeft: 6 }}>
                        {t('admin.drivers.trustBadge')}
                      </span>
                    )}
                  </td>
                  <td>
                    {d.no_show_count ?? 0}
                    {d.flagged_at && (
                      <span className="chip cancelled" style={{ marginLeft: 6 }}>
                        {t('admin.drivers.flagged')}
                      </span>
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn ghost small" onClick={() => setAccountFor(accountFor === d.id ? null : d.id)}>
                      {accountFor === d.id ? t('admin.drivers.close') : t('admin.drivers.driverAccess')}
                    </button>
                    <button className="btn danger small" onClick={() => void remove(d.id)}>
                      {t('admin.common.delete')}
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
  const { t } = useI18n();
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
      setMsg(t('admin.drivers.accountSaved'));
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
          ? t('admin.drivers.accountLoading')
          : account
            ? t('admin.drivers.accountExisting', { email: account.email })
            : t('admin.drivers.accountNone')}
      </p>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="form-grid" onSubmit={(e) => void submit(e)}>
        <label htmlFor={`driver-account-email-${driverId}`}>
          {t('admin.drivers.loginEmail')}
          <input
            id={`driver-account-email-${driverId}`}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label htmlFor={`driver-account-password-${driverId}`}>
          {t('admin.drivers.passwordLabel', { suffix: account ? t('admin.drivers.passwordNewSuffix') : '' })}
          <input
            id={`driver-account-password-${driverId}`}
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="btn primary" disabled={busy}>
          {account ? t('admin.drivers.resetPassword') : t('admin.drivers.createAccess')}
        </button>
      </form>
    </div>
  );
}

// ── Véhicules ────────────────────────────────────────────────────────────────

function VehiclesTab() {
  const { t } = useI18n();
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
      setMsg(t('admin.vehicles.added'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const remove = async (id: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/vehicles/${id}`, { method: 'DELETE' });
      setMsg(t('admin.common.deleted'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="card form-grid" onSubmit={(e) => void create(e)}>
        <label htmlFor="admin-vehicle-matricule">
          {t('admin.common.matricule')}
          <input
            id="admin-vehicle-matricule"
            required
            minLength={3}
            value={form.matricule}
            onChange={(e) => setForm({ ...form, matricule: e.target.value })}
          />
        </label>
        <label htmlFor="admin-vehicle-seats">
          {t('admin.common.seats')}
          <input
            id="admin-vehicle-seats"
            type="number"
            min={1}
            required
            value={form.seats}
            onChange={(e) => setForm({ ...form, seats: e.target.value })}
          />
        </label>
        <label htmlFor="admin-vehicle-make">
          {t('admin.common.make')}
          <input id="admin-vehicle-make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
        </label>
        <label htmlFor="admin-vehicle-model">
          {t('admin.common.model')}
          <input id="admin-vehicle-model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </label>
        <button className="btn primary">{t('admin.common.add')}</button>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.matricule')}</th>
              <th>{t('admin.common.seats')}</th>
              <th>{t('admin.vehicles.makeModel')}</th>
              <th>{t('admin.vehicles.inspection')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td>{v.matricule}</td>
                <td>{v.seats}</td>
                <td>{[v.make, v.model].filter(Boolean).join(' ') || '—'}</td>
                <td>
                  {v.is_eligible ? (
                    <span className="chip confirmed">{t('admin.vehicles.eligible')}</span>
                  ) : (
                    <span className="chip cancelled" title={t('admin.vehicles.notEligibleTitle')}>
                      {t('admin.vehicles.notEligible')}
                    </span>
                  )}
                </td>
                <td>
                  <button className="btn danger small" onClick={() => void remove(v.id)}>
                    {t('admin.common.delete')}
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
  const { t } = useI18n();
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
      setMsg(t('admin.customers.added'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="card form-grid" onSubmit={(e) => void create(e)}>
        <label htmlFor="admin-customer-name">
          {t('admin.common.fullName')}
          <input
            id="admin-customer-name"
            required
            minLength={2}
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </label>
        <label htmlFor="admin-customer-phone">
          {t('admin.common.phone')}
          <input
            id="admin-customer-phone"
            required
            pattern="^\+?[0-9]{8,15}$"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        <label htmlFor="admin-customer-email">
          {t('admin.common.emailOptional')}
          <input id="admin-customer-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <button className="btn primary">{t('admin.common.add')}</button>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.name')}</th>
              <th>{t('admin.common.phone')}</th>
              <th>{t('admin.common.email')}</th>
              <th>{t('admin.customers.createdAt')}</th>
              <th>{t('admin.drivers.rating')}</th>
              <th>{t('admin.drivers.noShows')}</th>
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
                  {c.flagged_at && (
                    <span className="chip cancelled" style={{ marginLeft: 6 }}>
                      {t('admin.drivers.flagged')}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  {t('admin.customers.none')}
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
  const { t } = useI18n();
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
      setMsg(action === 'confirm' ? t('admin.reservations.confirmed') : t('admin.reservations.cancelled'));
      await load(statusFilter);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <div className="form-inline select-row">
        <label htmlFor="admin-reservations-filter">
          {t('admin.reservations.filterByStatus')}
          <select id="admin-reservations-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t('admin.common.all')}</option>
            <option value="pending">{t('admin.common.pending')}</option>
            <option value="confirmed">{t('admin.reservations.statusConfirmedOpt')}</option>
            <option value="completed">{t('admin.reservations.statusCompletedOpt')}</option>
            <option value="cancelled">{t('admin.reservations.statusCancelledOpt')}</option>
            <option value="no_show">{t('admin.reservations.statusNoShowOpt')}</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.code')}</th>
              <th>{t('admin.reservations.customer')}</th>
              <th>{t('admin.reservations.trip')}</th>
              <th>{t('admin.common.departure')}</th>
              <th>{t('admin.common.seats')}</th>
              <th>{t('admin.reservations.total')}</th>
              <th>{t('admin.reservations.paid')}</th>
              <th>{t('admin.reservations.balance')}</th>
              <th>{t('admin.common.status')}</th>
              <th>{t('admin.common.actions')}</th>
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
                  <span className={`chip ${r.status}`}>{t(`status.reservation.${r.status}`)}</span>
                </td>
                <td className="actions">
                  {r.status === 'pending' && (
                    <button className="btn primary small" onClick={() => void act(r.id, 'confirm')}>
                      {t('admin.reservations.confirm')}
                    </button>
                  )}
                  {(r.status === 'pending' || r.status === 'confirmed') && (
                    <button className="btn danger small" onClick={() => void act(r.id, 'cancel')}>
                      {t('admin.trips.cancel')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="empty">
                  {t('admin.reservations.none')}
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
  const { t } = useI18n();
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
      setMsg(t('admin.payments.recorded'));
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
      setMsg(t('admin.payments.settled'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const refund = async (id: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/payments/${id}/refund`, { method: 'POST', body: {} });
      setMsg(t('admin.payments.refunded_'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const retryRefund = async (refundId: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/refunds/${refundId}/retry`, { method: 'POST', body: {} });
      setMsg(t('admin.payments.retried'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const failRefund = async (refundId: string): Promise<void> => {
    const reason = window.prompt(t('admin.payments.failedReasonPrompt'), t('admin.payments.failedReasonDefault'));
    if (reason === null) return;
    setMsg('');
    try {
      await api(`/api/admin/refunds/${refundId}/fail`, { method: 'POST', body: { reason } });
      setMsg(t('admin.payments.markedFailed'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="card form-grid" onSubmit={(e) => void record(e)}>
        <label htmlFor="admin-payment-reservation">
          {t('admin.payments.reservation')}
          <select
            id="admin-payment-reservation"
            required
            value={form.reservation_id}
            onChange={(e) => setForm({ ...form, reservation_id: e.target.value })}
          >
            <option value="">{t('admin.common.pickOption')}</option>
            {reservations
              .filter((r) => r.status !== 'cancelled')
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {t('admin.payments.pickReservation', {
                    code: r.code,
                    name: r.customer_name,
                    balance: Number(r.balance_due).toLocaleString('fr-DZ'),
                    currency: r.currency,
                  })}
                </option>
              ))}
          </select>
        </label>
        <label htmlFor="admin-payment-amount">
          {t('admin.payments.amountLabel')}
          <input
            id="admin-payment-amount"
            type="number"
            min={1}
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </label>
        <label htmlFor="admin-payment-method">
          {t('admin.payments.method')}
          <select id="admin-payment-method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="cash">{t('admin.payments.methodCash')}</option>
            <option value="cib">{t('admin.payments.methodCib')}</option>
            <option value="edahabia">{t('admin.payments.methodEdahabia')}</option>
            <option value="bank_transfer">{t('admin.payments.methodBankTransfer')}</option>
            <option value="card">{t('admin.payments.methodCard')}</option>
          </select>
        </label>
        <label htmlFor="admin-payment-reference">
          {t('admin.common.referenceOptional')}
          <input id="admin-payment-reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </label>
        <button className="btn primary">{t('admin.payments.recordPayment')}</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.code')}</th>
              <th>{t('admin.payments.reservation')}</th>
              <th>{t('admin.reservations.customer')}</th>
              <th>{t('admin.common.amount')}</th>
              <th>{t('admin.payments.refunded')}</th>
              <th>{t('admin.payments.method')}</th>
              <th>{t('admin.payments.origin')}</th>
              <th>{t('admin.common.status')}</th>
              <th>{t('admin.common.actions')}</th>
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
                <td>{p.gateway ? <span className="chip pending">{t('admin.payments.online', { gateway: p.gateway })}</span> : t('admin.payments.manual')}</td>
                <td>
                  <span className={`chip ${p.status}`}>{t(`status.reservationPayment.${p.status}`)}</span>
                  {p.status === 'failed' && p.failure_reason && <div className="muted small">{p.failure_reason}</div>}
                </td>
                <td className="actions">
                  {p.status === 'pending' && (
                    <button className="btn primary small" onClick={() => void settle(p.id)}>
                      {t('admin.payments.settle')}
                    </button>
                  )}
                  {(p.status === 'paid' || p.status === 'partially_refunded') && (
                    <button className="btn ghost small" onClick={() => void refund(p.id)}>
                      {t('admin.payments.refund')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="empty">
                  {t('admin.payments.none')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaymentGatewayEventsPanel />

      <h2>
        {t('admin.payments.refundRegistryTitle')}
        {worklist.filter((w) => w.status === 'pending' || w.status === 'failed').length > 0 && (
          <span className="tab-badge">{worklist.filter((w) => w.status === 'pending' || w.status === 'failed').length}</span>
        )}
      </h2>
      <p className="muted small">{t('admin.payments.refundRegistryIntro')}</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.payments.payment')}</th>
              <th>{t('admin.payments.reservation')}</th>
              <th>{t('admin.reservations.trip')}</th>
              <th>{t('admin.reservations.customer')}</th>
              <th>{t('admin.common.amount')}</th>
              <th>{t('admin.payments.policy')}</th>
              <th>{t('admin.payments.origin')}</th>
              <th>{t('admin.common.status')}</th>
              <th>{t('admin.common.actions')}</th>
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
                <td>{w.initiated_by === 'system' ? t('admin.payments.originAutomatic') : t('admin.payments.originAdmin')}</td>
                <td>
                  <span className={`chip ${w.status}`}>{w.status}</span>
                  {w.status === 'failed' && w.failure_reason && <div className="muted small">{w.failure_reason}</div>}
                </td>
                <td className="actions">
                  {w.status === 'failed' && (
                    <button className="btn primary small" onClick={() => void retryRefund(w.refund_id)}>
                      {t('admin.payments.retry')}
                    </button>
                  )}
                  {(w.status === 'pending' || w.status === 'processing') && (
                    <button className="btn ghost small" onClick={() => void failRefund(w.refund_id)}>
                      {t('admin.payments.markFailed')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {worklist.length === 0 && (
              <tr>
                <td colSpan={9} className="empty">
                  {t('admin.payments.noRefunds')}
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
  const { t } = useI18n();
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
      setMsg(t('admin.promoCodes.created'));
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
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="card form-grid" onSubmit={(e) => void create(e)}>
        <label htmlFor="admin-promo-code">
          {t('admin.promoCodes.code')}
          <input id="admin-promo-code" required minLength={3} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </label>
        <label htmlFor="admin-promo-type">
          {t('admin.promoCodes.type')}
          <select
            id="admin-promo-type"
            value={form.discount_type}
            onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'fixed' | 'percentage' })}
          >
            <option value="fixed">{t('admin.promoCodes.typeFixed')}</option>
            <option value="percentage">{t('admin.promoCodes.typePercentage')}</option>
          </select>
        </label>
        <label htmlFor="admin-promo-value">
          {t('admin.promoCodes.value')}
          <input
            id="admin-promo-value"
            type="number"
            min={0.01}
            step="0.01"
            required
            value={form.discount_value}
            onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
          />
        </label>
        <label htmlFor="admin-promo-min">
          {t('admin.promoCodes.minAmount')}
          <input
            id="admin-promo-min"
            type="number"
            min={0}
            step="0.01"
            value={form.min_amount}
            onChange={(e) => setForm({ ...form, min_amount: e.target.value })}
          />
        </label>
        <label htmlFor="admin-promo-max-total">
          {t('admin.promoCodes.maxUsesTotal')}
          <input
            id="admin-promo-max-total"
            type="number"
            min={1}
            value={form.max_uses_total}
            onChange={(e) => setForm({ ...form, max_uses_total: e.target.value })}
          />
        </label>
        <label htmlFor="admin-promo-max-per-customer">
          {t('admin.promoCodes.maxUsesPerCustomer')}
          <input
            id="admin-promo-max-per-customer"
            type="number"
            min={1}
            value={form.max_uses_per_customer}
            onChange={(e) => setForm({ ...form, max_uses_per_customer: e.target.value })}
          />
        </label>
        <label htmlFor="admin-promo-starts">
          {t('admin.promoCodes.startsAt')}
          <input
            id="admin-promo-starts"
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
          />
        </label>
        <label htmlFor="admin-promo-expires">
          {t('admin.promoCodes.expiresAt')}
          <input
            id="admin-promo-expires"
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          />
        </label>
        <button className="btn primary">{t('admin.promoCodes.createCode')}</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.promoCodes.code')}</th>
              <th>{t('admin.promoCodes.type')}</th>
              <th>{t('admin.promoCodes.value')}</th>
              <th>{t('admin.promoCodes.min')}</th>
              <th>{t('admin.promoCodes.usages')}</th>
              <th>{t('admin.promoCodes.window')}</th>
              <th>{t('admin.common.status')}</th>
              <th>{t('admin.common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.code}</strong>
                </td>
                <td>{p.discount_type === 'fixed' ? t('admin.promoCodes.typeFixedShort') : t('admin.promoCodes.typePercentageShort')}</td>
                <td>{p.discount_type === 'fixed' ? `${Number(p.discount_value).toLocaleString('fr-DZ')} DZD` : `${p.discount_value}%`}</td>
                <td>{Number(p.min_amount).toLocaleString('fr-DZ')} DZD</td>
                <td>
                  {p.max_uses_total ?? '∞'} / {p.max_uses_per_customer}
                </td>
                <td className="muted small">
                  {p.starts_at ? fmtDateTime(p.starts_at) : '—'} → {p.expires_at ? fmtDateTime(p.expires_at) : '—'}
                </td>
                <td>
                  <span className={`chip ${p.active ? 'active' : 'inactive'}`}>{p.active ? t('admin.promoCodes.active') : t('admin.promoCodes.inactive')}</span>
                </td>
                <td className="actions">
                  <button className="btn ghost small" onClick={() => void toggle(p.id, p.active)}>
                    {p.active ? t('admin.promoCodes.deactivate') : t('admin.promoCodes.activate')}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  {t('admin.promoCodes.none')}
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
  const { t } = useI18n();
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
      setMsg(t('admin.payouts.batchCreated'));
      await loadDriver(driverId);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const markPaid = async (batchId: string): Promise<void> => {
    const reference = window.prompt(t('admin.payouts.referencePrompt'));
    if (!reference) return;
    setMsg('');
    try {
      await api(`/api/admin/payout-batches/${batchId}/mark-paid`, { method: 'POST', body: { reference } });
      setMsg(t('admin.payouts.markedPaid'));
      await loadDriver(driverId);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <label htmlFor="admin-payout-driver">
        {t('admin.common.driver')}
        <select id="admin-payout-driver" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          <option value="">{t('admin.payouts.pickDriver')}</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {t('admin.payouts.driverOption', { name: d.full_name, phone: d.phone })}
            </option>
          ))}
        </select>
      </label>

      {driverId && summary && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '14px 0' }}>
            {(
              [
                [t('admin.payouts.grossRevenue'), summary.gross_revenue, true],
                [t('admin.payouts.commission'), summary.commission, false],
                [t('admin.payouts.refunds'), summary.refunds, false],
                [t('admin.payouts.netEarnings'), summary.net_earnings, true],
                [t('admin.payouts.pendingPayout'), summary.pending_payout, true],
                [t('admin.payouts.paidOut'), summary.paid_out, true],
              ] as Array<[string, string, boolean]>
            ).map(([label, value, positive]) => (
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
            <label htmlFor="admin-payout-period-start">
              {t('admin.payouts.periodStart')}
              <input
                id="admin-payout-period-start"
                type="datetime-local"
                required
                value={batchForm.period_start}
                onChange={(e) => setBatchForm({ ...batchForm, period_start: e.target.value })}
              />
            </label>
            <label htmlFor="admin-payout-period-end">
              {t('admin.payouts.periodEnd')}
              <input
                id="admin-payout-period-end"
                type="datetime-local"
                required
                value={batchForm.period_end}
                onChange={(e) => setBatchForm({ ...batchForm, period_end: e.target.value })}
              />
            </label>
            <button className="btn primary small">{t('admin.payouts.createBatch')}</button>
          </form>

          <h3>{t('admin.payouts.batchesTitle')}</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('admin.payouts.period')}</th>
                  <th>{t('admin.common.amount')}</th>
                  <th>{t('admin.common.status')}</th>
                  <th>{t('admin.common.reference')}</th>
                  <th>{t('admin.common.actions')}</th>
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
                          {t('admin.payouts.markPaid')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty">
                      {t('admin.payouts.noBatches')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h3>{t('admin.payouts.ledgerTitle')}</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('admin.common.type')}</th>
                  <th>{t('admin.reservations.trip')}</th>
                  <th>{t('admin.payments.reservation')}</th>
                  <th>{t('admin.payouts.netEarnings')}</th>
                  <th>Batch</th>
                  <th>{t('admin.common.date')}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id}>
                    <td>{l.entry_type === 'earning' ? t('admin.payouts.entryTypeEarning') : t('admin.payouts.entryTypeAdjustment')}</td>
                    <td>{l.trip_code ?? '—'}</td>
                    <td>{l.reservation_code ?? '—'}</td>
                    <td className={Number(l.net_amount) < 0 ? 'negative' : 'positive'}>{Number(l.net_amount).toLocaleString('fr-DZ')} DZD</td>
                    <td>{l.payout_batch_id ? t('admin.payouts.assigned') : '—'}</td>
                    <td>{fmtDateTime(l.created_at)}</td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      {t('admin.payouts.none')}
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
  const { t } = useI18n();
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [form, setForm] = useState({ kind: 'driver' as 'driver' | 'vehicle', target_id: '', gps_lat: '', gps_lon: '' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [tr, d, v] = await Promise.all([
      api<{ tracking: TrackingRow[] }>('/api/admin/tracking'),
      api<{ drivers: DriverRow[] }>('/api/admin/drivers'),
      api<{ vehicles: VehicleRow[] }>('/api/admin/vehicles'),
    ]);
    setRows(tr.tracking);
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
      setMsg(t('admin.tracking.updated'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="card form-grid" onSubmit={(e) => void push(e)}>
        <label htmlFor="admin-tracking-kind">
          {t('admin.tracking.targetType')}
          <select
            id="admin-tracking-kind"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as 'driver' | 'vehicle', target_id: '' })}
          >
            <option value="driver">{t('admin.tracking.targetDriver')}</option>
            <option value="vehicle">{t('admin.tracking.targetVehicle')}</option>
          </select>
        </label>
        <label htmlFor="admin-tracking-target">
          {t('admin.tracking.target')}
          <select id="admin-tracking-target" required value={form.target_id} onChange={(e) => setForm({ ...form, target_id: e.target.value })}>
            <option value="">{t('admin.common.pickOption')}</option>
            {(form.kind === 'driver' ? drivers : vehicles).map((x) => (
              <option key={x.id} value={x.id}>
                {'full_name' in x ? x.full_name : x.matricule}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="admin-tracking-lat">
          {t('admin.tracking.latitude')}
          <input
            id="admin-tracking-lat"
            type="number"
            step="0.000001"
            min={-90}
            max={90}
            required
            value={form.gps_lat}
            onChange={(e) => setForm({ ...form, gps_lat: e.target.value })}
          />
        </label>
        <label htmlFor="admin-tracking-lon">
          {t('admin.tracking.longitude')}
          <input
            id="admin-tracking-lon"
            type="number"
            step="0.000001"
            min={-180}
            max={180}
            required
            value={form.gps_lon}
            onChange={(e) => setForm({ ...form, gps_lon: e.target.value })}
          />
        </label>
        <button className="btn primary">{t('admin.tracking.updatePosition')}</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.type')}</th>
              <th>{t('admin.common.name')}</th>
              <th>{t('admin.tracking.latitude')}</th>
              <th>{t('admin.tracking.longitude')}</th>
              <th>{t('admin.tracking.recordedAt')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.kind === 'driver' ? t('admin.tracking.targetDriver') : t('admin.tracking.targetVehicle')}</td>
                <td>{r.kind === 'driver' ? r.driver_name : r.vehicle_matricule}</td>
                <td>{r.gps_lat}</td>
                <td>{r.gps_lon}</td>
                <td>{r.recorded_at ? fmtDateTime(r.recorded_at) : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  {t('admin.tracking.none')}
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
  const { t } = useI18n();
  const [rows, setRows] = useState<DomainErrorRow[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<{ errors: DomainErrorRow[] }>('/api/registry/errors')
      .then((r) => setRows(r.errors))
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div>
      {msg && (
        <p className="alert error" role="alert">
          {msg}
        </p>
      )}
      <p className="muted">{t('admin.errors.intro')}</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.code')}</th>
              <th>{t('admin.errors.name')}</th>
              <th>{t('admin.errors.description')}</th>
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
  const { t } = useI18n();
  const [events, setEvents] = useState<NoShowEventRow[]>([]);
  const [kindFilter, setKindFilter] = useState<'' | 'customer' | 'driver'>('');
  const [threshold, setThreshold] = useState<number | null>(null);
  const [thresholdInput, setThresholdInput] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async (kind: '' | 'customer' | 'driver') => {
    try {
      const qs = kind ? `?kind=${kind}` : '';
      const [e, th] = await Promise.all([
        api<{ events: NoShowEventRow[] }>(`/api/admin/no-show-events${qs}`),
        api<{ value: number }>('/api/admin/settings/no-show-threshold'),
      ]);
      setEvents(e.events);
      setThreshold(th.value);
      setThresholdInput(String(th.value));
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
      setMsg(t('admin.noShow.thresholdUpdated'));
      await load(kindFilter);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      <p className="muted">{t('admin.noShow.intro')}</p>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="card form-grid" onSubmit={(e) => void saveThreshold(e)} style={{ maxWidth: 320 }}>
        <label htmlFor="admin-noshow-threshold">
          {t('admin.noShow.thresholdLabel')}
          {threshold !== null && (
            <input
              id="admin-noshow-threshold"
              type="number"
              min={1}
              required
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
            />
          )}
        </label>
        <button className="btn primary">{t('admin.noShow.saveThreshold')}</button>
      </form>

      <div style={{ margin: '12px 0' }}>
        <select
          aria-label={t('admin.common.filter')}
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as '' | 'customer' | 'driver')}
        >
          <option value="">{t('admin.common.all')}</option>
          <option value="customer">{t('admin.noShow.customersOpt')}</option>
          <option value="driver">{t('admin.noShow.driversOpt')}</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.date')}</th>
              <th>{t('admin.common.type')}</th>
              <th>{t('admin.noShow.person')}</th>
              <th>{t('admin.noShow.trip')}</th>
              <th>{t('admin.noShow.note')}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>{fmtDateTime(ev.recorded_at)}</td>
                <td>{ev.kind === 'customer' ? t('admin.noShow.customer') : t('admin.noShow.driver')}</td>
                <td>{ev.kind === 'customer' ? ev.customer_name : ev.driver_name}</td>
                <td>{ev.trip_code ?? '—'}</td>
                <td>{ev.notes ?? '—'}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  {t('admin.noShow.none')}
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
  const { t } = useI18n();
  const KYC_DOC_LABEL: Record<KycDocType, string> = {
    identity: t('status.kycDoc.identity'),
    license: t('status.kycDoc.license'),
    vehicle_registration: t('status.kycDoc.vehicle_registration'),
    insurance: t('status.kycDoc.insurance'),
  };
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
      setMsg(t('admin.kyc.approved'));
      await load(statusFilter);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string): Promise<void> => {
    const reason = window.prompt(t('admin.common.rejectReasonPrompt'), '');
    if (!reason) return;
    setBusyId(id);
    setMsg('');
    try {
      await api(`/api/admin/kyc/${id}/reject`, { method: 'POST', body: { reason } });
      setMsg(t('admin.kyc.rejected'));
      await load(statusFilter);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <p className="muted">{t('admin.kyc.intro')}</p>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <div style={{ margin: '12px 0' }}>
        <select
          aria-label={t('admin.common.filter')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | KycDocumentRow['status'])}
        >
          <option value="pending">{t('admin.common.pending')}</option>
          <option value="approved">{t('admin.common.approved')}</option>
          <option value="rejected">{t('admin.common.rejected')}</option>
          <option value="">{t('admin.common.all')}</option>
        </select>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.kyc.driver')}</th>
              <th>{t('admin.common.type')}</th>
              <th>{t('admin.kyc.sentAt')}</th>
              <th>{t('admin.common.file')}</th>
              <th>{t('admin.common.status')}</th>
              <th>{t('admin.common.actions')}</th>
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
                    {t('admin.common.viewFile')}
                  </a>
                </td>
                <td>
                  <span className={`chip ${d.status === 'approved' ? 'confirmed' : d.status === 'rejected' ? 'cancelled' : 'pending'}`}>
                    {t(`status.kyc.${d.status}`)}
                  </span>
                  {d.status === 'rejected' && d.rejection_reason && <div className="muted small">{d.rejection_reason}</div>}
                </td>
                <td className="actions">
                  {d.status === 'pending' && (
                    <>
                      <button className="btn primary small" disabled={busyId === d.id} onClick={() => void approve(d.id)}>
                        {t('admin.common.approve')}
                      </button>
                      <button className="btn danger small" disabled={busyId === d.id} onClick={() => void reject(d.id)}>
                        {t('admin.common.reject')}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  {t('admin.kyc.none')}
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
  const { t } = useI18n();
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
        {open ? t('admin.payments.webhookLogHide') : t('admin.payments.webhookLogShow')} {t('admin.payments.webhookLogTitle')}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <p className="muted small">{t('admin.payments.webhookLogIntro')}</p>
          {msg && (
            <p className="alert info" role="status">
              {msg}
            </p>
          )}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('admin.payments.receivedAt')}</th>
                  <th>{t('admin.payments.gateway')}</th>
                  <th>{t('admin.payments.event')}</th>
                  <th>{t('admin.payments.signature')}</th>
                  <th>{t('admin.payments.result')}</th>
                  <th>{t('admin.payments.note')}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>{fmtDateTime(e.received_at)}</td>
                    <td>{e.gateway}</td>
                    <td>{e.event_type}</td>
                    <td>{e.signature_valid ? '✔' : t('admin.payments.signatureInvalid')}</td>
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
                      {t('admin.payments.noWebhooks')}
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

function VehicleInspectionReviewTab() {
  const { t } = useI18n();
  const MAINTENANCE_LABEL: Record<MaintenanceStatus, string> = {
    ok: t('driver.maintenance.ok'),
    needs_service: t('driver.maintenance.needs_service'),
    out_of_service: t('driver.maintenance.out_of_service'),
  };
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
      setMsg(t('admin.inspections.recorded'));
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
      setMsg(t('admin.inspections.approved'));
      await load(statusFilter);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string): Promise<void> => {
    const reason = window.prompt(t('admin.common.rejectReasonPrompt'), '');
    if (!reason) return;
    setBusyId(id);
    setMsg('');
    try {
      await api(`/api/admin/vehicle-inspections/${id}/reject`, { method: 'POST', body: { reason } });
      setMsg(t('admin.inspections.rejected'));
      await load(statusFilter);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <p className="muted">{t('admin.inspections.intro')}</p>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="card form-grid" onSubmit={(e) => void create(e)}>
        <label htmlFor="admin-inspection-vehicle">
          {t('admin.inspections.vehicleLabel')}
          <select id="admin-inspection-vehicle" required value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
            <option value="">{t('admin.common.pickOption')}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.matricule}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="admin-inspection-date">
          {t('admin.common.inspectionDate')}
          <input
            id="admin-inspection-date"
            type="date"
            required
            value={form.inspection_date}
            onChange={(e) => setForm({ ...form, inspection_date: e.target.value })}
          />
        </label>
        <label htmlFor="admin-inspection-expiry">
          {t('admin.common.expiryDate')}
          <input
            id="admin-inspection-expiry"
            type="date"
            required
            value={form.expiry_date}
            onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
          />
        </label>
        <label htmlFor="admin-inspection-maintenance">
          {t('admin.common.maintenanceStatus')}
          <select
            id="admin-inspection-maintenance"
            value={form.maintenance_status}
            onChange={(e) => setForm({ ...form, maintenance_status: e.target.value as MaintenanceStatus })}
          >
            <option value="ok">{t('driver.maintenance.ok')}</option>
            <option value="needs_service">{t('driver.maintenance.needs_service')}</option>
            <option value="out_of_service">{t('driver.maintenance.out_of_service')}</option>
          </select>
        </label>
        <label htmlFor="admin-inspection-notes">
          {t('admin.common.notesOptional')}
          <input id="admin-inspection-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <button className="btn primary">{t('admin.common.save')}</button>
      </form>
      <div style={{ margin: '12px 0' }}>
        <select
          aria-label={t('admin.common.filter')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | VehicleInspectionRow['approval_state'])}
        >
          <option value="pending">{t('admin.common.pending')}</option>
          <option value="approved">{t('admin.common.approved')}</option>
          <option value="rejected">{t('admin.common.rejected')}</option>
          <option value="">{t('admin.common.all')}</option>
        </select>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.inspections.vehicleLabel')}</th>
              <th>{t('admin.common.inspectionDate')}</th>
              <th>{t('admin.inspections.expiry')}</th>
              <th>{t('admin.inspections.maintenance')}</th>
              <th>{t('admin.common.file')}</th>
              <th>{t('admin.common.status')}</th>
              <th>{t('admin.common.actions')}</th>
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
                      {t('admin.common.viewFile')}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <span className={`chip ${r.approval_state === 'approved' ? 'confirmed' : r.approval_state === 'rejected' ? 'cancelled' : 'pending'}`}>
                    {t(`status.kyc.${r.approval_state}`)}
                  </span>
                  {r.approval_state === 'rejected' && r.rejection_reason && <div className="muted small">{r.rejection_reason}</div>}
                </td>
                <td className="actions">
                  {r.approval_state === 'pending' && (
                    <>
                      <button className="btn primary small" disabled={busyId === r.id} onClick={() => void approve(r.id)}>
                        {t('admin.common.approve')}
                      </button>
                      <button className="btn danger small" disabled={busyId === r.id} onClick={() => void reject(r.id)}>
                        {t('admin.common.reject')}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  {t('admin.inspections.none')}
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
  const { t } = useI18n();
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
        setMsg(t('admin.ratings.shown'));
      } else {
        const reason = window.prompt(t('admin.ratings.hidePrompt'), '');
        if (!reason) {
          setBusyId(null);
          return;
        }
        await api(`/api/admin/ratings/${r.id}/moderate`, { method: 'POST', body: { hide: true, reason } });
        setMsg(t('admin.ratings.hiddenMsg'));
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
      <p className="muted">{t('admin.ratings.intro')}</p>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.ratings.reservation')}</th>
              <th>{t('admin.ratings.direction')}</th>
              <th>{t('admin.ratings.from')}</th>
              <th>{t('admin.ratings.to')}</th>
              <th>{t('admin.ratings.rating')}</th>
              <th>{t('admin.ratings.review')}</th>
              <th>{t('admin.common.status')}</th>
              <th>{t('admin.common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.reservation_code}</td>
                <td>{r.direction === 'customer_to_driver' ? t('admin.ratings.directionCustomerToDriver') : t('admin.ratings.directionDriverToCustomer')}</td>
                <td>{r.rater_customer_name ?? r.rater_driver_name}</td>
                <td>{r.ratee_driver_name ?? r.ratee_customer_name}</td>
                <td>{'★'.repeat(r.stars)}</td>
                <td className="muted small">{r.review ?? '—'}</td>
                <td>
                  {r.hidden_at ? <span className="chip cancelled">{t('admin.ratings.hidden')}</span> : <span className="chip confirmed">{t('admin.ratings.visible')}</span>}
                  {r.hidden_at && r.moderation_reason && <div className="muted small">{r.moderation_reason}</div>}
                </td>
                <td className="actions">
                  <button className="btn ghost small" disabled={busyId === r.id} onClick={() => void toggleHide(r)}>
                    {r.hidden_at ? t('admin.ratings.show') : t('admin.ratings.hide')}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  {t('admin.ratings.none')}
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

function FraudSignalsTab() {
  const { t } = useI18n();
  const FRAUD_SIGNAL_LABEL: Record<FraudSignalRow['signal_type'], string> = {
    duplicate_nin: t('admin.fraud.types.duplicate_nin'),
    duplicate_phone: t('admin.fraud.types.duplicate_phone'),
    rapid_cancel_rebook: t('admin.fraud.types.rapid_cancel_rebook'),
    repeated_no_show: t('admin.fraud.types.repeated_no_show'),
    suspicious_payment: t('admin.fraud.types.suspicious_payment'),
    account_burst: t('admin.fraud.types.account_burst'),
  };
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
      <p className="muted">{t('admin.fraud.intro')}</p>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <button className="btn ghost small" onClick={() => void load()}>
        {t('admin.common.refresh')}
      </button>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.type')}</th>
              <th>{t('admin.fraud.severity')}</th>
              <th>{t('admin.fraud.subject')}</th>
              <th>{t('admin.fraud.detail')}</th>
              <th>{t('admin.fraud.detectedAt')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={i}>
                <td>{FRAUD_SIGNAL_LABEL[s.signal_type]}</td>
                <td>
                  <span className={`chip ${s.severity === 'high' ? 'cancelled' : s.severity === 'medium' ? 'pending' : 'confirmed'}`}>{s.severity}</span>
                </td>
                <td>{s.subject_label}</td>
                <td className="muted small">{s.detail}</td>
                <td>{fmtDateTime(s.detected_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  {t('admin.fraud.none')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
