import { timingSafeEqual } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { SupabaseConnection } from '../../DB/connection';
import {
  INIT_DB_MANAGED_KEYS,
  dbConfigFromFile,
  maskValue,
  readEnvFile,
  writeEnvFile,
} from '../../DB/envFile';
import { hashPassword } from '../auth/passwords';
import { ensureAuthSchema } from '../authSchema';
import { ensureDomainSchema } from '../domainSchema';

/**
 * `/api/init-db` — a self-service "fix a broken deployment" console.
 *
 * Always mounted, independently of whether the real database connected at
 * boot (that's the whole point: this is how you *recover* from a bad
 * DATABASE_URL / token without SSH-ing in to hand-edit backend/.env).
 *
 *  - GET  /status              → public, no auth: is a DB configured? reachable? (lets the
 *                                 frontend decide whether to show the setup screen at all)
 *  - everything else           → requires HTTP Basic auth, default admin/admin
 *                                 (override via INIT_DB_USERNAME/INIT_DB_PASSWORD, which are
 *                                 themselves editable through this same tool).
 *  - GET  /env                 → current managed env values (secrets masked)
 *  - POST /test                → try connecting with given or current values, without saving
 *  - POST /save                → test (if DB fields given) then write backend/.env
 *  - GET  /checks               → run all maintenance checks (connection / schema / admin account)
 *  - POST /checks/:name        → re-run a single check
 *  - POST /fix/schema           → (re)run the auth+domain schema migrations
 *  - POST /fix/admin-account    → create or reset the default Wassalni admin account
 */

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    // Compare against itself anyway so the response time doesn't trivially
    // leak the correct length.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

function requireInitDbAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  let user = '';
  let pass = '';
  if (scheme === 'Basic' && encoded) {
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const sep = decoded.indexOf(':');
      if (sep >= 0) {
        user = decoded.slice(0, sep);
        pass = decoded.slice(sep + 1);
      }
    } catch {
      /* malformed header — falls through to the 401 below */
    }
  }
  const env = readEnvFile();
  const expectedUser = env.INIT_DB_USERNAME || 'admin';
  const expectedPass = env.INIT_DB_PASSWORD || 'admin';
  if (!timingSafeEqualStr(user, expectedUser) || !timingSafeEqualStr(pass, expectedPass)) {
    // Deliberately NOT setting a `WWW-Authenticate` response header here:
    // doing so makes browsers hijack this 401 and pop up their own native
    // Basic-Auth login dialog instead of letting the React page's own form
    // show the error inline. The credentials are still checked exactly the
    // same way — this just keeps the UI in our hands.
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Identifiants admin invalides.' } });
    return;
  }
  next();
}

interface ConnectionCheckResult {
  ok: boolean;
  mode?: 'direct' | 'management-api';
  target?: string;
  error?: string;
}

async function testConnection(
  overrides: { databaseUrl?: string; supabaseAccessToken?: string; supabaseProjectRef?: string } = {},
): Promise<ConnectionCheckResult> {
  const cfg = dbConfigFromFile(overrides);
  if (!cfg.databaseUrl && !cfg.supabaseAccessToken) {
    return { ok: false, error: 'Aucune méthode de connexion configurée (DATABASE_URL ou SUPABASE_ACCESS_TOKEN).' };
  }
  const conn = new SupabaseConnection(cfg);
  try {
    await conn.init();
    const info = conn.describe();
    return { ok: true, mode: info.mode, target: info.target };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await conn.close().catch(() => undefined);
  }
}

interface SchemaCheckResult {
  ok: boolean;
  authTables?: string[];
  domainTables?: string[];
  error?: string;
}

async function checkSchema(): Promise<SchemaCheckResult> {
  const cfg = dbConfigFromFile();
  if (!cfg.databaseUrl && !cfg.supabaseAccessToken) return { ok: false, error: 'Base de données non configurée.' };
  const conn = new SupabaseConnection(cfg);
  try {
    await conn.init();
    const authRes = await conn.execute(
      `select tablename from pg_tables where schemaname='public' and tablename in ('app_user','app_user_otp','app_session')`,
    );
    const domainRes = await conn.execute(
      `select tablename from pg_tables where schemaname='public' and tablename in ('driver','customer','trip')`,
    );
    const authTables = authRes.rows.map((r) => String((r as { tablename: string }).tablename));
    const domainTables = domainRes.rows.map((r) => String((r as { tablename: string }).tablename));
    return { ok: authTables.length === 3 && domainTables.length === 3, authTables, domainTables };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await conn.close().catch(() => undefined);
  }
}

interface AdminCheckResult {
  ok: boolean;
  admins?: Array<{ email: string; role: string; admin_role: string | null }>;
  error?: string;
}

async function checkAdminAccount(): Promise<AdminCheckResult> {
  const cfg = dbConfigFromFile();
  if (!cfg.databaseUrl && !cfg.supabaseAccessToken) return { ok: false, error: 'Base de données non configurée.' };
  const conn = new SupabaseConnection(cfg);
  try {
    await conn.init();
    const result = await conn.execute(
      `select email, role, admin_role from app_user where role = 'admin' order by created_at asc limit 5`,
    );
    return { ok: result.rows.length > 0, admins: result.rows as AdminCheckResult['admins'] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await conn.close().catch(() => undefined);
  }
}

export function initDbRoutes(): Router {
  const router = Router();

  // Public — the frontend polls this (no credentials) purely to decide
  // whether to redirect to the setup screen at all.
  router.get('/status', async (_req, res) => {
    const env = readEnvFile();
    const result = await testConnection();
    res.json({
      configured: Boolean(env.DATABASE_URL || env.SUPABASE_ACCESS_TOKEN),
      connected: result.ok,
      mode: result.mode,
      target: result.target,
      error: result.ok ? undefined : result.error,
    });
  });

  router.use(requireInitDbAuth);

  router.get('/env', (_req, res) => {
    const env = readEnvFile();
    const display: Record<string, string> = {};
    for (const key of INIT_DB_MANAGED_KEYS) {
      if (key in env) display[key] = maskValue(key, env[key]);
    }
    res.json({ env: display, managedKeys: INIT_DB_MANAGED_KEYS });
  });

  router.post('/test', async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await testConnection({
      databaseUrl: typeof body.DATABASE_URL === 'string' ? body.DATABASE_URL : undefined,
      supabaseAccessToken: typeof body.SUPABASE_ACCESS_TOKEN === 'string' ? body.SUPABASE_ACCESS_TOKEN : undefined,
      supabaseProjectRef: typeof body.SUPABASE_PROJECT_REF === 'string' ? body.SUPABASE_PROJECT_REF : undefined,
    });
    res.status(result.ok ? 200 : 400).json(result);
  });

  router.post('/save', async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates: Record<string, string> = {};
    for (const key of INIT_DB_MANAGED_KEYS) {
      const value = body[key];
      if (typeof value === 'string' && value.length > 0) updates[key] = value;
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Aucun champ reconnu à enregistrer.' } });
      return;
    }
    // If any DB-connection field is part of this save, verify it BEFORE
    // writing — a typo should never leave the project worse off than before.
    if (updates.DATABASE_URL || updates.SUPABASE_ACCESS_TOKEN || updates.SUPABASE_PROJECT_REF) {
      const probe = await testConnection({
        databaseUrl: updates.DATABASE_URL,
        supabaseAccessToken: updates.SUPABASE_ACCESS_TOKEN,
        supabaseProjectRef: updates.SUPABASE_PROJECT_REF,
      });
      if (!probe.ok) {
        res.status(400).json({
          error: { code: 'CONNECTION_FAILED', message: probe.error ?? 'Connexion impossible avec ces paramètres.' },
        });
        return;
      }
    }
    writeEnvFile(updates);
    res.json({
      saved: true,
      keys: Object.keys(updates),
      note: "backend/.env mis à jour — le serveur redémarre et se reconnecte automatiquement (quelques secondes).",
    });
  });

  router.get('/checks', async (_req, res) => {
    const [connection, schema, adminAccount] = await Promise.all([testConnection(), checkSchema(), checkAdminAccount()]);
    res.json({ connection, schema, adminAccount });
  });

  router.post('/checks/connection', async (_req, res) => res.json(await testConnection()));
  router.post('/checks/schema', async (_req, res) => res.json(await checkSchema()));
  router.post('/checks/admin-account', async (_req, res) => res.json(await checkAdminAccount()));

  router.post('/fix/schema', async (_req, res) => {
    const cfg = dbConfigFromFile();
    if (!cfg.databaseUrl && !cfg.supabaseAccessToken) {
      res.status(400).json({ ok: false, error: 'Base de données non configurée.' });
      return;
    }
    const conn = new SupabaseConnection(cfg);
    try {
      await conn.init();
      await ensureAuthSchema(conn);
      await ensureDomainSchema(conn);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      await conn.close().catch(() => undefined);
    }
  });

  router.post('/fix/admin-account', async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = typeof body.email === 'string' && body.email ? body.email : 'admin@wassalni.local';
    const password = typeof body.password === 'string' && body.password ? body.password : 'admin';
    const fullName = typeof body.fullName === 'string' && body.fullName ? body.fullName : 'Admin';
    const cfg = dbConfigFromFile();
    if (!cfg.databaseUrl && !cfg.supabaseAccessToken) {
      res.status(400).json({ ok: false, error: 'Base de données non configurée.' });
      return;
    }
    const conn = new SupabaseConnection(cfg);
    try {
      await conn.init();
      const passwordHash = await hashPassword(password);
      const existing = await conn.execute(`select id from app_user where email = $1`, [email]);
      if (existing.rows.length > 0) {
        await conn.execute(
          `update app_user
             set password_hash = $1, role = 'admin', admin_role = coalesce(admin_role, 'super_admin'),
                 email_verified = true, failed_attempts = 0, locked_until = null, updated_at = now()
           where email = $2`,
          [passwordHash, email],
        );
      } else {
        await conn.execute(
          `insert into app_user (email, password_hash, full_name, role, admin_role, email_verified)
           values ($1, $2, $3, 'admin', 'super_admin', true)`,
          [email, passwordHash, fullName],
        );
      }
      res.json({ ok: true, email });
    } catch (err) {
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      await conn.close().catch(() => undefined);
    }
  });

  return router;
}
