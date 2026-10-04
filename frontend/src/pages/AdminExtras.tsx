import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, fileUrl, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import type {
  AdminAuditLogRow,
  AdminUserRow,
  AnalyticsSummary,
  DriverRow,
  ImportLogRow,
  RecurringTemplateRow,
  SosEventRow,
  TrajectoryRow,
  WaitlistEntryRow,
} from '../types';

/** Task 12.4 — admin action audit log viewer (who did what, when, to what). */
export function AuditLogTab() {
  const { t } = useI18n();
  const [rows, setRows] = useState<AdminAuditLogRow[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setRows((await api<{ entries: AdminAuditLogRow[] }>('/api/admin/audit-log?limit=300')).entries);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <p className="muted">{t('admin.auditLog.intro')}</p>
      {msg && (
        <p className="alert error" role="alert">
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
              <th>{t('admin.common.date')}</th>
              <th>{t('admin.auditLog.admin')}</th>
              <th>{t('admin.auditLog.action')}</th>
              <th>{t('admin.auditLog.target')}</th>
              <th>{t('admin.auditLog.reason')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtDateTime(r.created_at)}</td>
                <td>{r.admin_name ?? '—'}</td>
                <td>{r.action}</td>
                <td className="muted small">
                  {r.target_type ?? '—'} {r.target_id ? `#${r.target_id.slice(0, 8)}` : ''}
                </td>
                <td className="muted small">{r.reason ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  {t('admin.auditLog.none')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Task 12.1 — operational analytics dashboard. */
export function AnalyticsTab() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [wilayaPairs, setWilayaPairs] = useState<Record<string, unknown>[]>([]);
  const [trajectoryDemand, setTrajectoryDemand] = useState<Record<string, unknown>[]>([]);
  const [driverPerf, setDriverPerf] = useState<Record<string, unknown>[]>([]);
  const [failedSearches, setFailedSearches] = useState<Record<string, unknown>[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api<AnalyticsSummary>('/api/admin/analytics/summary'),
      api<{ pairs: Record<string, unknown>[] }>('/api/admin/analytics/top-wilaya-pairs'),
      api<{ trajectories: Record<string, unknown>[] }>('/api/admin/analytics/trajectory-demand'),
      api<{ drivers: Record<string, unknown>[] }>('/api/admin/analytics/driver-performance'),
      api<{ searches: Record<string, unknown>[] }>('/api/admin/analytics/failed-searches'),
    ])
      .then(([s, wp, td, dp, fs]) => {
        setSummary(s);
        setWilayaPairs(wp.pairs);
        setTrajectoryDemand(td.trajectories);
        setDriverPerf(dp.drivers);
        setFailedSearches(fs.searches);
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div>
      {msg && (
        <p className="alert error" role="alert">
          {msg}
        </p>
      )}
      {summary && (
        <div className="grid">
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>{t('admin.analytics.revenue')}</h2>
            <p style={{ fontSize: '1.4rem', fontWeight: 800 }}>{Number(summary.revenue).toLocaleString('fr-DZ')} DZD</p>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>{t('admin.analytics.reservations')}</h2>
            <p style={{ fontSize: '1.4rem', fontWeight: 800 }}>{summary.bookings}</p>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>{t('admin.analytics.occupancyRate')}</h2>
            <p style={{ fontSize: '1.4rem', fontWeight: 800 }}>{(Number(summary.occupancy_pct) * 100).toFixed(0)}%</p>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>{t('admin.analytics.cancellationsNoShows')}</h2>
            <p style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              {summary.cancellations} / {summary.no_shows}
            </p>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>{t('admin.analytics.refunds')}</h2>
            <p style={{ fontSize: '1.4rem', fontWeight: 800 }}>{Number(summary.refunds_total).toLocaleString('fr-DZ')} DZD</p>
          </div>
        </div>
      )}

      <GenericTable title={t('admin.analytics.topWilayaPairs')} rows={wilayaPairs} />
      <GenericTable title={t('admin.analytics.trajectoryDemand')} rows={trajectoryDemand} />
      <GenericTable title={t('admin.analytics.driverPerformance')} rows={driverPerf} />
      <GenericTable title={t('admin.analytics.failedSearches')} rows={failedSearches} />
    </div>
  );
}

/** Minimal generic key/value table for analytics rows whose shape varies per query. */
function GenericTable({ title, rows }: { title: string; rows: Record<string, unknown>[] }) {
  const { t } = useI18n();
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return (
    <>
      <h2 style={{ marginTop: 22 }}>{title}</h2>
      {rows.length === 0 ? (
        <p className="empty">{t('admin.common.noData')}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c}>{String(r[c] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** Task 10.3 — recurring trip templates (generate a week's worth of trips at once). */
export function RecurringTemplatesTab() {
  const { t } = useI18n();
  const WEEKDAYS = [
    t('admin.recurring.weekdays.d0'),
    t('admin.recurring.weekdays.d1'),
    t('admin.recurring.weekdays.d2'),
    t('admin.recurring.weekdays.d3'),
    t('admin.recurring.weekdays.d4'),
    t('admin.recurring.weekdays.d5'),
    t('admin.recurring.weekdays.d6'),
  ];
  const [rows, setRows] = useState<RecurringTemplateRow[]>([]);
  const [trajectories, setTrajectories] = useState<TrajectoryRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [form, setForm] = useState({
    trajectory_id: '',
    driver_id: '',
    weekdays: [] as number[],
    departure_time: '08:00',
    capacity: '20',
    seat_price: '500',
    starts_on: new Date().toISOString().slice(0, 10),
    ends_on: '',
    horizon_days: '14',
  });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [tpl, tj, d] = await Promise.all([
        api<{ templates: RecurringTemplateRow[] }>('/api/admin/recurring-templates'),
        api<{ trajectories: TrajectoryRow[] }>('/api/admin/trajectories'),
        api<{ drivers: DriverRow[] }>('/api/admin/drivers'),
      ]);
      setRows(tpl.templates);
      setTrajectories(tj.trajectories);
      setDrivers(d.drivers);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const toggleWeekday = (d: number): void => {
    setForm((f) => ({ ...f, weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d].sort() }));
  };

  const create = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/admin/recurring-templates', {
        method: 'POST',
        body: {
          trajectory_id: form.trajectory_id,
          driver_id: form.driver_id || null,
          weekdays: form.weekdays,
          departure_time: form.departure_time,
          capacity: Number(form.capacity),
          seat_price: Number(form.seat_price),
          starts_on: form.starts_on,
          ends_on: form.ends_on || null,
          horizon_days: Number(form.horizon_days),
        },
      });
      setMsg(t('admin.recurring.created'));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const generate = async (id: string): Promise<void> => {
    setMsg('');
    try {
      const r = await api<{ generated: number }>(`/api/admin/recurring-templates/${id}/generate`, { method: 'POST', body: {} });
      setMsg(t('admin.recurring.generated', { count: r.generated }));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const cancelTemplate = async (id: string): Promise<void> => {
    if (!confirm(t('admin.recurring.stopConfirm'))) return;
    setMsg('');
    try {
      const r = await api<{ cancelled: number }>(`/api/admin/recurring-templates/${id}/cancel`, { method: 'POST', body: {} });
      setMsg(t('admin.recurring.stopped_', { count: r.cancelled }));
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      <p className="muted">{t('admin.recurring.intro')}</p>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <form className="form-grid card" onSubmit={(e) => void create(e)} style={{ marginBottom: 16 }}>
        <label htmlFor="recurring-trajectory">
          {t('admin.common.trajectory')}
          <select id="recurring-trajectory" required value={form.trajectory_id} onChange={(e) => setForm({ ...form, trajectory_id: e.target.value })}>
            <option value="">{t('admin.common.pickOption')}</option>
            {trajectories.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="recurring-driver">
          {t('admin.recurring.driverOptional')}
          <select id="recurring-driver" value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })}>
            <option value="">{t('admin.common.pickOption')}</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="recurring-time">
          {t('admin.recurring.departureTime')}
          <input
            id="recurring-time"
            type="time"
            required
            value={form.departure_time}
            onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
          />
        </label>
        <label htmlFor="recurring-capacity">
          {t('admin.common.capacity')}
          <input
            id="recurring-capacity"
            type="number"
            min={1}
            required
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
        </label>
        <label htmlFor="recurring-seat-price">
          {t('admin.recurring.seatPrice')}
          <input
            id="recurring-seat-price"
            type="number"
            min={0}
            required
            value={form.seat_price}
            onChange={(e) => setForm({ ...form, seat_price: e.target.value })}
          />
        </label>
        <label htmlFor="recurring-start">
          {t('admin.recurring.startDate')}
          <input id="recurring-start" type="date" required value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} />
        </label>
        <label htmlFor="recurring-end">
          {t('admin.recurring.endDateOptional')}
          <input id="recurring-end" type="date" value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} />
        </label>
        <label htmlFor="recurring-horizon">
          {t('admin.recurring.generationHorizon')}
          <input
            id="recurring-horizon"
            type="number"
            min={1}
            max={90}
            value={form.horizon_days}
            onChange={(e) => setForm({ ...form, horizon_days: e.target.value })}
          />
        </label>
        <div>
          <span className="muted small">{t('admin.recurring.weekdaysLabel')}</span>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {WEEKDAYS.map((label, i) => (
              <button
                type="button"
                key={i}
                className={`tab${form.weekdays.includes(i) ? ' active' : ''}`}
                style={{ padding: '4px 8px' }}
                onClick={() => toggleWeekday(i)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button className="btn primary">{t('admin.recurring.createTemplate')}</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.trajectory')}</th>
              <th>{t('admin.common.driver')}</th>
              <th>{t('admin.recurring.days')}</th>
              <th>{t('admin.recurring.time')}</th>
              <th>{t('admin.common.price')}</th>
              <th>{t('admin.recurring.generatedThrough')}</th>
              <th>{t('admin.common.status')}</th>
              <th>{t('admin.common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.trajectory_name}</td>
                <td>{r.driver_name ?? '—'}</td>
                <td>{r.weekdays.map((d) => WEEKDAYS[d]).join(', ')}</td>
                <td>{r.departure_time}</td>
                <td>{Number(r.seat_price).toLocaleString('fr-DZ')}</td>
                <td>{r.last_generated_through ?? '—'}</td>
                <td>
                  <span className={`chip ${r.active ? 'confirmed' : 'cancelled'}`}>{r.active ? t('admin.recurring.active') : t('admin.recurring.stopped')}</span>
                </td>
                <td className="actions">
                  {r.active && (
                    <>
                      <button className="btn ghost small" onClick={() => void generate(r.id)}>
                        {t('admin.recurring.generate')}
                      </button>
                      <button className="btn danger small" onClick={() => void cancelTemplate(r.id)}>
                        {t('admin.recurring.stop')}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  {t('admin.recurring.none')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Task 12.5 — import history, including failed runs (previously left no trace). */
export function ImportHistoryTab() {
  const { t } = useI18n();
  const [rows, setRows] = useState<ImportLogRow[]>([]);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    api<{ imports: ImportLogRow[] }>('/api/admin/import-history')
      .then((r) => setRows(r.imports))
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, []);
  return (
    <div>
      <p className="muted">{t('admin.importHistory.intro')}</p>
      {msg && (
        <p className="alert error" role="alert">
          {msg}
        </p>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.date')}</th>
              <th>{t('admin.importHistory.result')}</th>
              <th>{t('admin.importHistory.detail')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtDateTime(r.ran_at)}</td>
                <td>
                  <span className={`chip ${r.success ? 'confirmed' : 'cancelled'}`}>{r.success ? t('admin.importHistory.success') : t('admin.importHistory.failure')}</span>
                </td>
                <td className="muted small">{r.error_details ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="empty">
                  {t('admin.importHistory.none')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Task 12.6 — granular admin roles (super_admin only may reassign). */
export function AdminsTab() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api<{ admins: AdminUserRow[] }>('/api/admin/admins')
      .then((r) => setRows(r.admins))
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(load, [load]);

  const ROLES = ['super_admin', 'admin', 'support', 'finance', 'operations'] as const;

  const setRole = async (id: string, role: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/admin/admins/${id}/role`, { method: 'POST', body: { admin_role: role } });
      setMsg(t('admin.admins.roleUpdated'));
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const canEdit = user?.admin_role === 'super_admin';

  return (
    <div>
      <p className="muted">{t('admin.admins.intro')}</p>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.name')}</th>
              <th>{t('admin.common.email')}</th>
              <th>{t('admin.admins.role')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{a.full_name}</td>
                <td>{a.email}</td>
                <td>
                  <select disabled={!canEdit} value={a.admin_role ?? 'admin'} onChange={(e) => void setRole(a.id, e.target.value)}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Task 11.5 — SOS alerts console. */
export function SosAdminTab() {
  const { t } = useI18n();
  const [rows, setRows] = useState<SosEventRow[]>([]);
  const [filter, setFilter] = useState<'open' | 'acknowledged' | 'resolved' | ''>('open');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api<{ events: SosEventRow[] }>(`/api/admin/sos${filter ? `?status=${filter}` : ''}`)
      .then((r) => setRows(r.events))
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, [filter]);
  useEffect(load, [load]);

  const resolve = async (id: string): Promise<void> => {
    const notes = window.prompt(t('admin.sos.resolvePrompt'), '') ?? undefined;
    try {
      await api(`/api/admin/sos/${id}/resolve`, { method: 'POST', body: { notes } });
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      <div className="form-inline" style={{ marginBottom: 10 }}>
        <label htmlFor="sos-filter">
          {t('admin.common.filter')}
          <select id="sos-filter" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="open">{t('admin.sos.filterOpen')}</option>
            <option value="acknowledged">{t('admin.sos.filterAcknowledged')}</option>
            <option value="resolved">{t('admin.sos.filterResolved')}</option>
            <option value="">{t('admin.common.all')}</option>
          </select>
        </label>
      </div>
      {msg && (
        <p className="alert error" role="alert">
          {msg}
        </p>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.common.date')}</th>
              <th>{t('admin.sos.role')}</th>
              <th>{t('admin.sos.position')}</th>
              <th>{t('admin.sos.notes')}</th>
              <th>{t('admin.common.status')}</th>
              <th>{t('admin.common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{fmtDateTime(s.created_at)}</td>
                <td>{s.role}</td>
                <td>{s.lat != null && s.lon != null ? `${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}` : '—'}</td>
                <td className="muted small">{s.notes ?? '—'}</td>
                <td>
                  <span className={`chip ${s.status === 'resolved' ? 'confirmed' : 'pending'}`}>{s.status}</span>
                </td>
                <td>
                  {s.status !== 'resolved' && (
                    <button className="btn danger small" onClick={() => void resolve(s.id)}>
                      {t('admin.sos.markResolved')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  {t('admin.sos.none')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Platform configuration (Task 12.4's "change configuration" audit example). */
export function SettingsTab() {
  const { t } = useI18n();
  const [rows, setRows] = useState<{ key: string; value: string; updated_at: string }[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api<{ settings: { key: string; value: string; updated_at: string }[] }>('/api/admin/settings')
      .then((r) => setRows(r.settings))
      .catch((e) => setMsg(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(load, [load]);

  const save = async (key: string): Promise<void> => {
    if (edits[key] === undefined) return;
    setMsg('');
    try {
      await api(`/api/admin/settings/${encodeURIComponent(key)}`, { method: 'PUT', body: { value: edits[key] } });
      setMsg(t('admin.common.saved'));
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      <p className="muted">{t('admin.settings.intro')}</p>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.settings.key')}</th>
              <th>{t('admin.settings.value')}</th>
              <th>{t('admin.settings.updatedAt')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.key}</td>
                <td>
                  <input
                    aria-label={r.key}
                    value={edits[r.key] ?? r.value}
                    onChange={(e) => setEdits({ ...edits, [r.key]: e.target.value })}
                  />
                </td>
                <td className="muted small">{fmtDateTime(r.updated_at)}</td>
                <td>
                  <button className="btn ghost small" onClick={() => void save(r.key)}>
                    {t('admin.common.save')}
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

/** Task 12.3 — CSV/PDF exports across the main admin data categories. */
export function ExportsTab() {
  const { t } = useI18n();
  const categories: { id: string; label: string }[] = [
    { id: 'drivers', label: t('admin.exports.categories.drivers') },
    { id: 'customers', label: t('admin.exports.categories.customers') },
    { id: 'trips', label: t('admin.exports.categories.trips') },
    { id: 'reservations', label: t('admin.exports.categories.reservations') },
    { id: 'payments', label: t('admin.exports.categories.payments') },
    { id: 'refunds', label: t('admin.exports.categories.refunds') },
    { id: 'payouts', label: t('admin.exports.categories.payouts') },
    { id: 'analytics', label: t('admin.exports.categories.analytics') },
  ];
  return (
    <div>
      <p className="muted">{t('admin.exports.intro')}</p>
      <div className="grid">
        {categories.map((c) => (
          <div key={c.id} className="card">
            <h2 style={{ marginTop: 0, fontSize: '0.95rem' }}>{c.label}</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <a className="btn ghost small" href={fileUrl(`/api/admin/export/${c.id}.csv`)}>
                {t('admin.exports.csv')}
              </a>
              <a className="btn ghost small" href={fileUrl(`/api/admin/export/${c.id}.pdf`)} target="_blank" rel="noreferrer">
                {t('admin.exports.pdf')}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Task 10.2 — admin-side waitlist overview, keyed by trip id typed in manually (no trip picker here — reached from the Trips tab normally). */
export function WaitlistAdminTab() {
  const { t } = useI18n();
  const [tripId, setTripId] = useState('');
  const [entries, setEntries] = useState<WaitlistEntryRow[]>([]);
  const [msg, setMsg] = useState('');

  const load = async (): Promise<void> => {
    if (!tripId.trim()) return;
    setMsg('');
    try {
      const r = await api<{ entries: WaitlistEntryRow[] }>(`/api/admin/trips/${tripId.trim()}/waitlist`);
      setEntries(r.entries);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const promote = async (): Promise<void> => {
    if (!tripId.trim()) return;
    setMsg('');
    try {
      const r = await api<{ promoted: number }>(`/api/admin/trips/${tripId.trim()}/waitlist/promote`, { method: 'POST', body: {} });
      setMsg(t('admin.waitlist.promoted', { count: r.promoted }));
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <p className="muted">{t('admin.waitlist.intro')}</p>
      <div className="form-inline">
        <label htmlFor="waitlist-trip-id">
          {t('admin.waitlist.tripIdLabel')}
          <input
            id="waitlist-trip-id"
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
            placeholder={t('admin.waitlist.tripIdPlaceholder')}
          />
        </label>
        <button className="btn ghost small" onClick={() => void load()}>
          {t('admin.waitlist.load')}
        </button>
        <button className="btn primary small" onClick={() => void promote()}>
          {t('admin.waitlist.promoteNow')}
        </button>
      </div>
      {msg && (
        <p className="alert info" role="status">
          {msg}
        </p>
      )}
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('admin.reservations.customer')}</th>
              <th>{t('admin.common.seats')}</th>
              <th>{t('admin.common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.position}</td>
                <td>{e.customer_name ?? '—'}</td>
                <td>{e.seats}</td>
                <td>{e.status}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  {t('admin.waitlist.none')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
