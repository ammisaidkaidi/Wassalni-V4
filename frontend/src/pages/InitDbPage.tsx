import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * `/init-db` — self-service "fix a broken deployment" console.
 *
 * Talks directly to `/api/init-db/*` (backend/api/routes/initDb.ts) with its
 * own fetch calls rather than the shared `api()` helper: those endpoints use
 * HTTP Basic auth (default admin/admin), not the app's normal session
 * cookie/sid, and must keep working even while the rest of the API is down
 * — which is precisely when this page is needed. App.tsx auto-redirects
 * here whenever /api/init-db/status reports the database isn't reachable.
 *
 * This is an internal operations tool, not end-user UI, so (deliberately,
 * to keep scope sane) its copy is French-only rather than run through the
 * app's fr/en/ar i18n system — consistent with the backend's own
 * French-language startup/error messages.
 */

interface StatusResp {
  configured: boolean;
  connected: boolean;
  mode?: string;
  target?: string;
  error?: string;
}

interface ConnResult {
  ok: boolean;
  mode?: string;
  target?: string;
  error?: string;
}

interface SchemaResult {
  ok: boolean;
  authTables?: string[];
  domainTables?: string[];
  error?: string;
}

interface AdminResult {
  ok: boolean;
  admins?: Array<{ email: string; role: string; admin_role: string | null }>;
  error?: string;
}

interface ChecksResp {
  connection: ConnResult;
  schema: SchemaResult;
  adminAccount: AdminResult;
}

const DB_FIELDS = ['DATABASE_URL', 'SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN'] as const;
const OTHER_FIELDS = ['CORS_ORIGIN', 'PORT', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const;
const AUTH_FIELDS = ['INIT_DB_USERNAME', 'INIT_DB_PASSWORD'] as const;

function StatusBadge({ ok }: { ok: boolean | undefined }) {
  if (ok === undefined) return <span className="chip">—</span>;
  return <span className={`chip ${ok ? 'succeeded' : 'failed'}`}>{ok ? '✅ OK' : '❌ Échec'}</span>;
}

export default function InitDbPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusResp | null>(null);

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [unlocked, setUnlocked] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const [currentEnv, setCurrentEnv] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<Record<string, string>>({});

  const [testResult, setTestResult] = useState<ConnResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const [checks, setChecks] = useState<ChecksResp | null>(null);
  const [checksBusy, setChecksBusy] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState({ email: 'admin@wassalni.local', password: 'admin', fullName: 'Admin' });

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/init-db/status');
      const data = (await res.json()) as StatusResp;
      setStatus(data);
      return data;
    } catch {
      setStatus({ configured: false, connected: false, error: 'Impossible de joindre le serveur API.' });
      return null;
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const t = setInterval(() => void loadStatus(), 8000);
    return () => clearInterval(t);
  }, [loadStatus]);

  function authHeader(): string {
    return 'Basic ' + btoa(`${username}:${password}`);
  }

  async function callProtected<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
    const res = await fetch(path, {
      method: opts.method ?? 'GET',
      headers: {
        Authorization: authHeader(),
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
    if (!res.ok) throw new Error((data as { error?: { message?: string } }).error?.message ?? `Erreur ${res.status}`);
    return data;
  }

  async function unlock(e: FormEvent): Promise<void> {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      const data = await callProtected<{ env: Record<string, string> }>('/api/init-db/env');
      setCurrentEnv(data.env);
      setUnlocked(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    } finally {
      setAuthBusy(false);
    }
  }

  function setField(key: string, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function nonEmptyFields(keys: readonly string[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const k of keys) {
      const v = fields[k];
      if (v) out[k] = v;
    }
    return out;
  }

  async function runTest(): Promise<void> {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await callProtected<ConnResult>('/api/init-db/test', {
        method: 'POST',
        body: nonEmptyFields(DB_FIELDS),
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  }

  async function save(): Promise<void> {
    setSaving(true);
    setSaveResult(null);
    try {
      const body = { ...nonEmptyFields(DB_FIELDS), ...nonEmptyFields(OTHER_FIELDS), ...nonEmptyFields(AUTH_FIELDS) };
      const result = await callProtected<{ saved: boolean; keys: string[]; note: string }>('/api/init-db/save', {
        method: 'POST',
        body,
      });
      setSaveResult({ ok: true, message: result.note });
      setFields({});
      setReconnecting(true);
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = setInterval(() => {
        void loadStatus().then((s) => {
          if (s?.connected) {
            setReconnecting(false);
            if (pollTimer.current) clearInterval(pollTimer.current);
          }
        });
      }, 2000);
    } catch (err) {
      setSaveResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
  }, []);

  async function runAllChecks(): Promise<void> {
    setChecksBusy('all');
    try {
      setChecks(await callProtected<ChecksResp>('/api/init-db/checks'));
    } finally {
      setChecksBusy(null);
    }
  }

  async function runOneCheck(name: 'connection' | 'schema' | 'admin-account'): Promise<void> {
    setChecksBusy(name);
    try {
      const result = await callProtected<ConnResult | SchemaResult | AdminResult>(`/api/init-db/checks/${name}`, {
        method: 'POST',
      });
      setChecks((prev) => ({
        connection: name === 'connection' ? (result as ConnResult) : prev?.connection ?? { ok: false },
        schema: name === 'schema' ? (result as SchemaResult) : prev?.schema ?? { ok: false },
        adminAccount: name === 'admin-account' ? (result as AdminResult) : prev?.adminAccount ?? { ok: false },
      }));
    } finally {
      setChecksBusy(null);
    }
  }

  async function fixSchema(): Promise<void> {
    setChecksBusy('fix-schema');
    try {
      await callProtected('/api/init-db/fix/schema', { method: 'POST' });
      await runOneCheck('schema');
    } finally {
      setChecksBusy(null);
    }
  }

  async function fixAdmin(): Promise<void> {
    setChecksBusy('fix-admin');
    try {
      await callProtected('/api/init-db/fix/admin-account', { method: 'POST', body: adminForm });
      await runOneCheck('admin-account');
    } finally {
      setChecksBusy(null);
    }
  }

  return (
    <section className="narrow">
      <h1>Configuration &amp; maintenance de la base de données</h1>
      <p className="muted">
        Cette page permet de configurer la connexion à Supabase et de diagnostiquer l'installation, même quand le
        reste de l'application est indisponible.
      </p>

      <div className={`alert ${status?.connected ? 'success' : 'error'}`}>
        {status === null
          ? 'Vérification de la connexion…'
          : status.connected
            ? `✅ Base de données connectée (${status.mode} → ${status.target})`
            : status.configured
              ? `❌ Base de données configurée mais injoignable : ${status.error}`
              : '❌ Aucune base de données configurée.'}
      </div>

      {status?.connected && (
        <p>
          <button type="button" className="btn ghost" onClick={() => navigate('/')}>
            ← Retourner à l'application
          </button>
        </p>
      )}

      {!unlocked ? (
        <form className="card" onSubmit={(e) => void unlock(e)}>
          <h2>Connexion administrateur</h2>
          <p className="muted small">Identifiants par défaut : admin / admin (configurable plus bas une fois connecté).</p>
          <label htmlFor="initdb-user">
            Utilisateur
            <input id="initdb-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label htmlFor="initdb-pass">
            Mot de passe
            <input
              id="initdb-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {authError && <div className="alert error">{authError}</div>}
          <button type="submit" className="btn primary" disabled={authBusy}>
            {authBusy ? '…' : 'Déverrouiller'}
          </button>
        </form>
      ) : (
        <>
          <div className="card">
            <h2>Connexion à la base de données</h2>
            <p className="muted small">
              Laissez un champ vide pour conserver sa valeur actuelle. Valeurs actuelles (masquées) :
            </p>
            <ul className="muted small">
              {DB_FIELDS.filter((k) => currentEnv[k]).map((k) => (
                <li key={k}>
                  {k} = {currentEnv[k]}
                </li>
              ))}
              {DB_FIELDS.every((k) => !currentEnv[k]) && <li>(aucune valeur configurée)</li>}
            </ul>

            <div className="form-grid">
              <label htmlFor="f-database-url">
                DATABASE_URL (option préférée — Postgres direct)
                <input
                  id="f-database-url"
                  placeholder="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
                  value={fields.DATABASE_URL ?? ''}
                  onChange={(e) => setField('DATABASE_URL', e.target.value)}
                />
              </label>
              <label htmlFor="f-ref">
                SUPABASE_PROJECT_REF
                <input id="f-ref" value={fields.SUPABASE_PROJECT_REF ?? ''} onChange={(e) => setField('SUPABASE_PROJECT_REF', e.target.value)} />
              </label>
              <label htmlFor="f-token">
                SUPABASE_ACCESS_TOKEN (sbp_… — repli via l'API de gestion si pas de DATABASE_URL)
                <input id="f-token" value={fields.SUPABASE_ACCESS_TOKEN ?? ''} onChange={(e) => setField('SUPABASE_ACCESS_TOKEN', e.target.value)} />
              </label>
            </div>

            <div className="form-inline">
              <button type="button" className="btn ghost" onClick={() => void runTest()} disabled={testing}>
                {testing ? 'Test en cours…' : 'Tester la connexion'}
              </button>
              <button type="button" className="btn primary" onClick={() => void save()} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer et reconnecter'}
              </button>
            </div>

            {testResult && (
              <div className={`alert ${testResult.ok ? 'success' : 'error'}`}>
                {testResult.ok ? `✅ Connexion OK (${testResult.mode} → ${testResult.target})` : `❌ ${testResult.error}`}
              </div>
            )}
            {saveResult && <div className={`alert ${saveResult.ok ? 'success' : 'error'}`}>{saveResult.message}</div>}
            {reconnecting && <div className="alert info">⏳ Reconnexion en cours — cette page se mettra à jour automatiquement…</div>}

            <details>
              <summary>Autres paramètres (CORS, cookies, SMTP)</summary>
              <div className="form-grid">
                {OTHER_FIELDS.map((k) => (
                  <label key={k} htmlFor={`f-${k}`}>
                    {k} {currentEnv[k] ? `(actuel : ${currentEnv[k]})` : ''}
                    <input id={`f-${k}`} value={fields[k] ?? ''} onChange={(e) => setField(k, e.target.value)} />
                  </label>
                ))}
              </div>
            </details>

            <details>
              <summary>Identifiants de cette page (admin/admin par défaut)</summary>
              <div className="form-grid">
                <label htmlFor="f-initdb-user">
                  Nouveau nom d'utilisateur
                  <input id="f-initdb-user" value={fields.INIT_DB_USERNAME ?? ''} onChange={(e) => setField('INIT_DB_USERNAME', e.target.value)} />
                </label>
                <label htmlFor="f-initdb-pass">
                  Nouveau mot de passe
                  <input
                    id="f-initdb-pass"
                    type="password"
                    value={fields.INIT_DB_PASSWORD ?? ''}
                    onChange={(e) => setField('INIT_DB_PASSWORD', e.target.value)}
                  />
                </label>
              </div>
              <p className="muted small">Ces deux champs sont inclus automatiquement si remplis quand vous cliquez "Enregistrer et reconnecter".</p>
            </details>
          </div>

          <div className="card">
            <h2>Maintenance — diagnostics</h2>
            <div className="form-inline">
              <button type="button" className="btn primary" onClick={() => void runAllChecks()} disabled={checksBusy !== null}>
                {checksBusy === 'all' ? 'Vérification…' : 'Tout vérifier'}
              </button>
            </div>

            <div className="table-wrap">
              <table className="table">
                <tbody>
                  <tr>
                    <td>Connexion à la base de données</td>
                    <td>
                      <StatusBadge ok={checks?.connection.ok} />
                    </td>
                    <td className="muted small">
                      {checks?.connection.ok ? `${checks.connection.mode} → ${checks.connection.target}` : checks?.connection.error}
                    </td>
                    <td>
                      <button type="button" className="btn small" onClick={() => void runOneCheck('connection')} disabled={checksBusy !== null}>
                        {checksBusy === 'connection' ? '…' : 'Tester'}
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Schéma de la base (tables auth + domaine)</td>
                    <td>
                      <StatusBadge ok={checks?.schema.ok} />
                    </td>
                    <td className="muted small">
                      {checks?.schema.error
                        ? checks.schema.error
                        : checks?.schema
                          ? `auth: ${checks.schema.authTables?.join(', ') || '—'} · domaine: ${checks.schema.domainTables?.join(', ') || '—'}`
                          : ''}
                    </td>
                    <td className="form-inline">
                      <button type="button" className="btn small" onClick={() => void runOneCheck('schema')} disabled={checksBusy !== null}>
                        {checksBusy === 'schema' ? '…' : 'Vérifier'}
                      </button>
                      <button type="button" className="btn small ghost" onClick={() => void fixSchema()} disabled={checksBusy !== null}>
                        {checksBusy === 'fix-schema' ? '…' : 'Réparer'}
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Compte administrateur Wassalni présent</td>
                    <td>
                      <StatusBadge ok={checks?.adminAccount.ok} />
                    </td>
                    <td className="muted small">
                      {checks?.adminAccount.error
                        ? checks.adminAccount.error
                        : checks?.adminAccount.admins?.map((a) => a.email).join(', ') || 'Aucun administrateur trouvé'}
                    </td>
                    <td>
                      <button type="button" className="btn small" onClick={() => void runOneCheck('admin-account')} disabled={checksBusy !== null}>
                        {checksBusy === 'admin-account' ? '…' : 'Vérifier'}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <details>
              <summary>Créer / réinitialiser le compte admin par défaut</summary>
              <div className="form-grid">
                <label htmlFor="admin-email">
                  Email
                  <input id="admin-email" value={adminForm.email} onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))} />
                </label>
                <label htmlFor="admin-password">
                  Mot de passe
                  <input
                    id="admin-password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </label>
                <label htmlFor="admin-fullname">
                  Nom complet
                  <input
                    id="admin-fullname"
                    value={adminForm.fullName}
                    onChange={(e) => setAdminForm((f) => ({ ...f, fullName: e.target.value }))}
                  />
                </label>
              </div>
              <button type="button" className="btn primary" onClick={() => void fixAdmin()} disabled={checksBusy !== null}>
                {checksBusy === 'fix-admin' ? '…' : 'Créer / réinitialiser cet administrateur'}
              </button>
            </details>
          </div>
        </>
      )}
    </section>
  );
}
