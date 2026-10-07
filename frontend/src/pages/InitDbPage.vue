<script setup lang="ts">
/**
 * `/init-db` — self-service "fix a broken deployment" console.
 *
 * Talks directly to `/api/init-db/*` (backend/api/routes/initDb.ts) with its
 * own fetch calls rather than the shared `api()` helper: those endpoints use
 * HTTP Basic auth (default admin/admin), not the app's normal session
 * cookie/sid, and must keep working even while the rest of the API is down
 * — which is precisely when this page is needed. App.vue auto-redirects
 * here whenever /api/init-db/status reports the database isn't reachable.
 *
 * This is an internal operations tool, not end-user UI, so (deliberately,
 * to keep scope sane) its copy is French-only rather than run through the
 * app's fr/en/ar i18n system — consistent with the backend's own
 * French-language startup/error messages.
 */
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

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

function badgeClass(ok: boolean | undefined): string {
  if (ok === undefined) return 'chip';
  return `chip ${ok ? 'succeeded' : 'failed'}`;
}
function badgeText(ok: boolean | undefined): string {
  if (ok === undefined) return '—';
  return ok ? '✅ OK' : '❌ Échec';
}

const router = useRouter();
const status = ref<StatusResp | null>(null);

const username = ref('admin');
const password = ref('admin');
const unlocked = ref(false);
const authError = ref('');
const authBusy = ref(false);

const currentEnv = ref<Record<string, string>>({});
const fields = reactive<Record<string, string>>({});

const testResult = ref<ConnResult | null>(null);
const testing = ref(false);
const saveResult = ref<{ ok: boolean; message: string } | null>(null);
const saving = ref(false);
const reconnecting = ref(false);

const checks = ref<ChecksResp | null>(null);
const checksBusy = ref<string | null>(null);
const adminForm = reactive({ email: 'admin@wassalni.local', password: 'admin', fullName: 'Admin' });

let pollTimer: ReturnType<typeof setInterval> | null = null;
let statusTimer: ReturnType<typeof setInterval> | null = null;

async function loadStatus(): Promise<StatusResp | null> {
  try {
    const res = await fetch('/api/init-db/status');
    const data = (await res.json()) as StatusResp;
    status.value = data;
    return data;
  } catch {
    status.value = { configured: false, connected: false, error: 'Impossible de joindre le serveur API.' };
    return null;
  }
}

onMounted(() => {
  void loadStatus();
  statusTimer = setInterval(() => void loadStatus(), 8000);
});

onUnmounted(() => {
  if (statusTimer) clearInterval(statusTimer);
  if (pollTimer) clearInterval(pollTimer);
});

function authHeader(): string {
  return 'Basic ' + btoa(`${username.value}:${password.value}`);
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

async function unlock(e: Event): Promise<void> {
  e.preventDefault();
  authError.value = '';
  authBusy.value = true;
  try {
    const data = await callProtected<{ env: Record<string, string> }>('/api/init-db/env');
    currentEnv.value = data.env;
    unlocked.value = true;
  } catch (err) {
    authError.value = err instanceof Error ? err.message : String(err);
  } finally {
    authBusy.value = false;
  }
}

function setField(key: string, value: string): void {
  fields[key] = value;
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
  testing.value = true;
  testResult.value = null;
  try {
    testResult.value = await callProtected<ConnResult>('/api/init-db/test', { method: 'POST', body: nonEmptyFields(DB_FIELDS) });
  } catch (err) {
    testResult.value = { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    testing.value = false;
  }
}

async function save(): Promise<void> {
  saving.value = true;
  saveResult.value = null;
  try {
    const body = { ...nonEmptyFields(DB_FIELDS), ...nonEmptyFields(OTHER_FIELDS), ...nonEmptyFields(AUTH_FIELDS) };
    const result = await callProtected<{ saved: boolean; keys: string[]; note: string }>('/api/init-db/save', { method: 'POST', body });
    saveResult.value = { ok: true, message: result.note };
    for (const k of Object.keys(fields)) delete fields[k];
    reconnecting.value = true;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      void loadStatus().then((s) => {
        if (s?.connected) {
          reconnecting.value = false;
          if (pollTimer) clearInterval(pollTimer);
        }
      });
    }, 2000);
  } catch (err) {
    saveResult.value = { ok: false, message: err instanceof Error ? err.message : String(err) };
  } finally {
    saving.value = false;
  }
}

async function runAllChecks(): Promise<void> {
  checksBusy.value = 'all';
  try {
    checks.value = await callProtected<ChecksResp>('/api/init-db/checks');
  } finally {
    checksBusy.value = null;
  }
}

async function runOneCheck(name: 'connection' | 'schema' | 'admin-account'): Promise<void> {
  checksBusy.value = name;
  try {
    const result = await callProtected<ConnResult | SchemaResult | AdminResult>(`/api/init-db/checks/${name}`, { method: 'POST' });
    const prev = checks.value;
    checks.value = {
      connection: name === 'connection' ? (result as ConnResult) : prev?.connection ?? { ok: false },
      schema: name === 'schema' ? (result as SchemaResult) : prev?.schema ?? { ok: false },
      adminAccount: name === 'admin-account' ? (result as AdminResult) : prev?.adminAccount ?? { ok: false },
    };
  } finally {
    checksBusy.value = null;
  }
}

async function fixSchema(): Promise<void> {
  checksBusy.value = 'fix-schema';
  try {
    await callProtected('/api/init-db/fix/schema', { method: 'POST' });
    await runOneCheck('schema');
  } finally {
    checksBusy.value = null;
  }
}

async function fixAdmin(): Promise<void> {
  checksBusy.value = 'fix-admin';
  try {
    await callProtected('/api/init-db/fix/admin-account', { method: 'POST', body: { ...adminForm } });
    await runOneCheck('admin-account');
  } finally {
    checksBusy.value = null;
  }
}
</script>

<template>
  <section class="narrow">
    <h1>Configuration &amp; maintenance de la base de données</h1>
    <p class="muted">
      Cette page permet de configurer la connexion à Supabase et de diagnostiquer l'installation, même quand le
      reste de l'application est indisponible.
    </p>

    <div :class="`alert ${status?.connected ? 'success' : 'error'}`">
      {{
        status === null
          ? 'Vérification de la connexion…'
          : status.connected
            ? `✅ Base de données connectée (${status.mode} → ${status.target})`
            : status.configured
              ? `❌ Base de données configurée mais injoignable : ${status.error}`
              : '❌ Aucune base de données configurée.'
      }}
    </div>

    <p v-if="status?.connected">
      <button type="button" class="btn ghost" @click="router.push('/')">← Retourner à l'application</button>
    </p>

    <form v-if="!unlocked" class="card" @submit="void unlock($event)">
      <h2>Connexion administrateur</h2>
      <p class="muted small">Identifiants par défaut : admin / admin (configurable plus bas une fois connecté).</p>
      <label for="initdb-user">
        Utilisateur
        <input id="initdb-user" v-model="username" autocomplete="username" />
      </label>
      <label for="initdb-pass">
        Mot de passe
        <input id="initdb-pass" v-model="password" type="password" autocomplete="current-password" />
      </label>
      <div v-if="authError" class="alert error">{{ authError }}</div>
      <button type="submit" class="btn primary" :disabled="authBusy">{{ authBusy ? '…' : 'Déverrouiller' }}</button>
    </form>

    <template v-else>
      <div class="card">
        <h2>Connexion à la base de données</h2>
        <p class="muted small">Laissez un champ vide pour conserver sa valeur actuelle. Valeurs actuelles (masquées) :</p>
        <ul class="muted small">
          <li v-for="k in DB_FIELDS.filter((k) => currentEnv[k])" :key="k">{{ k }} = {{ currentEnv[k] }}</li>
          <li v-if="DB_FIELDS.every((k) => !currentEnv[k])">(aucune valeur configurée)</li>
        </ul>

        <div class="form-grid">
          <label for="f-database-url">
            DATABASE_URL (option préférée — Postgres direct)
            <input
              id="f-database-url"
              :value="fields.DATABASE_URL ?? ''"
              placeholder="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
              @input="setField('DATABASE_URL', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label for="f-ref">
            SUPABASE_PROJECT_REF
            <input id="f-ref" :value="fields.SUPABASE_PROJECT_REF ?? ''" @input="setField('SUPABASE_PROJECT_REF', ($event.target as HTMLInputElement).value)" />
          </label>
          <label for="f-token">
            SUPABASE_ACCESS_TOKEN (sbp_… — repli via l'API de gestion si pas de DATABASE_URL)
            <input id="f-token" :value="fields.SUPABASE_ACCESS_TOKEN ?? ''" @input="setField('SUPABASE_ACCESS_TOKEN', ($event.target as HTMLInputElement).value)" />
          </label>
        </div>

        <div class="form-inline">
          <button type="button" class="btn ghost" :disabled="testing" @click="void runTest()">{{ testing ? 'Test en cours…' : 'Tester la connexion' }}</button>
          <button type="button" class="btn primary" :disabled="saving" @click="void save()">{{ saving ? 'Enregistrement…' : 'Enregistrer et reconnecter' }}</button>
        </div>

        <div v-if="testResult" :class="`alert ${testResult.ok ? 'success' : 'error'}`">
          {{ testResult.ok ? `✅ Connexion OK (${testResult.mode} → ${testResult.target})` : `❌ ${testResult.error}` }}
        </div>
        <div v-if="saveResult" :class="`alert ${saveResult.ok ? 'success' : 'error'}`">{{ saveResult.message }}</div>
        <div v-if="reconnecting" class="alert info">⏳ Reconnexion en cours — cette page se mettra à jour automatiquement…</div>

        <details>
          <summary>Autres paramètres (CORS, cookies, SMTP)</summary>
          <div class="form-grid">
            <label v-for="k in OTHER_FIELDS" :key="k" :for="`f-${k}`">
              {{ k }} {{ currentEnv[k] ? `(actuel : ${currentEnv[k]})` : '' }}
              <input :id="`f-${k}`" :value="fields[k] ?? ''" @input="setField(k, ($event.target as HTMLInputElement).value)" />
            </label>
          </div>
        </details>

        <details>
          <summary>Identifiants de cette page (admin/admin par défaut)</summary>
          <div class="form-grid">
            <label for="f-initdb-user">
              Nouveau nom d'utilisateur
              <input id="f-initdb-user" :value="fields.INIT_DB_USERNAME ?? ''" @input="setField('INIT_DB_USERNAME', ($event.target as HTMLInputElement).value)" />
            </label>
            <label for="f-initdb-pass">
              Nouveau mot de passe
              <input id="f-initdb-pass" type="password" :value="fields.INIT_DB_PASSWORD ?? ''" @input="setField('INIT_DB_PASSWORD', ($event.target as HTMLInputElement).value)" />
            </label>
          </div>
          <p class="muted small">Ces deux champs sont inclus automatiquement si remplis quand vous cliquez "Enregistrer et reconnecter".</p>
        </details>
      </div>

      <div class="card">
        <h2>Maintenance — diagnostics</h2>
        <div class="form-inline">
          <button type="button" class="btn primary" :disabled="checksBusy !== null" @click="void runAllChecks()">
            {{ checksBusy === 'all' ? 'Vérification…' : 'Tout vérifier' }}
          </button>
        </div>

        <div class="table-wrap">
          <table class="table">
            <tbody>
              <tr>
                <td>Connexion à la base de données</td>
                <td><span :class="badgeClass(checks?.connection.ok)">{{ badgeText(checks?.connection.ok) }}</span></td>
                <td class="muted small">{{ checks?.connection.ok ? `${checks.connection.mode} → ${checks.connection.target}` : checks?.connection.error }}</td>
                <td>
                  <button type="button" class="btn small" :disabled="checksBusy !== null" @click="void runOneCheck('connection')">
                    {{ checksBusy === 'connection' ? '…' : 'Tester' }}
                  </button>
                </td>
              </tr>
              <tr>
                <td>Schéma de la base (tables auth + domaine)</td>
                <td><span :class="badgeClass(checks?.schema.ok)">{{ badgeText(checks?.schema.ok) }}</span></td>
                <td class="muted small">
                  {{
                    checks?.schema.error
                      ? checks.schema.error
                      : checks?.schema
                        ? `auth: ${checks.schema.authTables?.join(', ') || '—'} · domaine: ${checks.schema.domainTables?.join(', ') || '—'}`
                        : ''
                  }}
                </td>
                <td class="form-inline">
                  <button type="button" class="btn small" :disabled="checksBusy !== null" @click="void runOneCheck('schema')">
                    {{ checksBusy === 'schema' ? '…' : 'Vérifier' }}
                  </button>
                  <button type="button" class="btn small ghost" :disabled="checksBusy !== null" @click="void fixSchema()">
                    {{ checksBusy === 'fix-schema' ? '…' : 'Réparer' }}
                  </button>
                </td>
              </tr>
              <tr>
                <td>Compte administrateur Wassalni présent</td>
                <td><span :class="badgeClass(checks?.adminAccount.ok)">{{ badgeText(checks?.adminAccount.ok) }}</span></td>
                <td class="muted small">
                  {{ checks?.adminAccount.error ? checks.adminAccount.error : checks?.adminAccount.admins?.map((a) => a.email).join(', ') || 'Aucun administrateur trouvé' }}
                </td>
                <td>
                  <button type="button" class="btn small" :disabled="checksBusy !== null" @click="void runOneCheck('admin-account')">
                    {{ checksBusy === 'admin-account' ? '…' : 'Vérifier' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <details>
          <summary>Créer / réinitialiser le compte admin par défaut</summary>
          <div class="form-grid">
            <label for="admin-email">
              Email
              <input id="admin-email" v-model="adminForm.email" />
            </label>
            <label for="admin-password">
              Mot de passe
              <input id="admin-password" v-model="adminForm.password" />
            </label>
            <label for="admin-fullname">
              Nom complet
              <input id="admin-fullname" v-model="adminForm.fullName" />
            </label>
          </div>
          <button type="button" class="btn primary" :disabled="checksBusy !== null" @click="void fixAdmin()">
            {{ checksBusy === 'fix-admin' ? '…' : 'Créer / réinitialiser cet administrateur' }}
          </button>
        </details>
      </div>
    </template>
  </section>
</template>
