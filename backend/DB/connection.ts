import { Pool, type PoolConfig } from 'pg';
import type { DbConfig } from './config';
import { SupabaseManagementApi } from './management-api';
import { inlineParams } from './sql-utils';

export type ConnectionMode = 'direct' | 'management-api';
export type QueryRow = Record<string, unknown>;

export interface QueryResult {
  rows: QueryRow[];
  rowCount: number | null;
  command: string | null;
}

export interface ScriptProgress {
  index: number;
  total: number;
  statement: string;
}
export interface ScriptFailure {
  index: number;
  statement: string;
  error: string;
}
export interface ScriptResult {
  executed: number;
  failures: ScriptFailure[];
}

/**
 * Unified SQL transport to your Supabase Postgres database.
 *
 *  - 'direct'         → node-postgres Pool over DATABASE_URL (preferred:
 *                       real bind parameters, transactions, single round-trips)
 *  - 'management-api' → Supabase Management API (POST /v1/projects/{ref}/database/query)
 *                       with only the sbp_ access token; parameters are safely
 *                       inlined as SQL literals.
 *
 * Both modes expose the exact same API, so DBHelper / DatabaseInitializer /
 * DomainRepository work identically regardless of the transport.
 */
export class SupabaseConnection {
  readonly mode: ConnectionMode;
  private readonly pool?: Pool;
  private readonly mgmt?: SupabaseManagementApi;
  private projectRef?: string;
  private initialized = false;

  constructor(private readonly config: DbConfig) {
    if (config.databaseUrl) {
      this.mode = 'direct';
      this.pool = new Pool(directPoolOptions(config.databaseUrl));
    } else if (config.supabaseAccessToken) {
      this.mode = 'management-api';
      this.mgmt = new SupabaseManagementApi(config.supabaseAccessToken);
    } else {
      throw new Error(
        'No connection method configured: set DATABASE_URL or SUPABASE_ACCESS_TOKEN (see backend/.env.example).',
      );
    }
  }

  /** Connect / verify credentials + resolve the project ref. Idempotent. */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.mode === 'direct') {
      await this.pool!.query('select 1');
    } else {
      this.projectRef = await this.mgmt!.resolveProjectRef(this.config.supabaseProjectRef);
      await this.mgmt!.runQuery(this.projectRef, 'select 1');
    }
    this.initialized = true;
  }

  /** Human-readable description (secrets masked, passwords stripped). */
  describe(): { mode: ConnectionMode; target: string } {
    if (this.mode === 'direct') {
      try {
        const u = new URL(this.config.databaseUrl!);
        return {
          mode: this.mode,
          target: `postgres://${u.username}@${u.hostname}:${u.port || '5432'}${u.pathname}`,
        };
      } catch {
        return { mode: this.mode, target: 'direct postgres' };
      }
    }
    return {
      mode: this.mode,
      target: `Supabase project ${this.projectRef ?? this.config.supabaseProjectRef ?? '(auto-detected)'}`,
    };
  }

  /**
   * Execute a SINGLE SQL statement (optionally with $n bind parameters).
   * In management-api mode the parameters are inlined as escaped literals.
   */
  async execute(sql: string, params: unknown[] = []): Promise<QueryResult> {
    await this.init();
    if (this.mode === 'direct') {
      const res = await this.pool!.query(sql, params as never[]);
      return { rows: res.rows as QueryRow[], rowCount: res.rowCount, command: res.command };
    }
    return this.apiExecute(sql, params);
  }

  /**
   * Execute a list of statements (e.g. the schema script).
   *  - direct mode: one transaction; with continueOnError each statement runs
   *    inside its own SAVEPOINT so failures don't abort the rest.
   *  - management-api mode: tries one batched request first, then falls back
   *    to one request per statement (no cross-statement transaction possible).
   */
  async executeScript(
    statements: string[],
    opts: { onProgress?: (p: ScriptProgress) => void; continueOnError?: boolean } = {},
  ): Promise<ScriptResult> {
    await this.init();
    const { onProgress, continueOnError = false } = opts;
    const failures: ScriptFailure[] = [];

    const wrap = (err: unknown, index: number, stmt: string): Error => {
      const msg = err instanceof Error ? err.message : String(err);
      const head = stmt.replace(/\s+/g, ' ').slice(0, 100);
      return new Error(
        `${msg}\n    ↳ failed at statement ${index + 1}/${statements.length}: "${head}${stmt.length > 100 ? '…' : ''}"`,
      );
    };

    if (this.mode === 'direct') {
      const client = await this.pool!.connect();
      try {
        await client.query('begin');
        for (let i = 0; i < statements.length; i++) {
          const sp = `sp_${i}`;
          if (continueOnError) await client.query(`savepoint ${sp}`);
          try {
            await client.query(statements[i]);
            onProgress?.({ index: i, total: statements.length, statement: statements[i] });
          } catch (err) {
            const wrapped = wrap(err, i, statements[i]);
            if (!continueOnError) {
              await client.query('rollback').catch(() => undefined);
              throw wrapped;
            }
            await client.query(`rollback to savepoint ${sp}`).catch(() => undefined);
            failures.push({ index: i, statement: statements[i], error: wrapped.message });
          }
        }
        await client.query('commit');
        return { executed: statements.length - failures.length, failures };
      } finally {
        client.release();
      }
    }

    // management-api mode — fast path: send the whole script in one request
    if (statements.length > 1) {
      try {
        await this.mgmt!.runQuery(this.projectRef!, statements.join(';\n\n'));
        onProgress?.({
          index: statements.length - 1,
          total: statements.length,
          statement: '(batched in one request)',
        });
        return { executed: statements.length, failures };
      } catch {
        // fall through: run statement-by-statement for precise error reporting
      }
    }
    for (let i = 0; i < statements.length; i++) {
      try {
        await this.apiExecute(statements[i], []);
        onProgress?.({ index: i, total: statements.length, statement: statements[i] });
      } catch (err) {
        const wrapped = wrap(err, i, statements[i]);
        if (!continueOnError) throw wrapped;
        failures.push({ index: i, statement: statements[i], error: wrapped.message });
      }
    }
    return { executed: statements.length - failures.length, failures };
  }

  /**
   * Run a set of statements inside a transaction (direct mode only).
   * The callback receives an `exec(sql, params)` bound to the transaction.
   */
  async transaction<T>(
    fn: (exec: (sql: string, params?: unknown[]) => Promise<QueryResult>) => Promise<T>,
  ): Promise<T> {
    if (this.mode !== 'direct') {
      throw new Error('transaction() requires direct mode (set DATABASE_URL in backend/.env)');
    }
    await this.init();
    const client = await this.pool!.connect();
    try {
      await client.query('begin');
      const exec = async (sql: string, params: unknown[] = []): Promise<QueryResult> => {
        const r = await client.query(sql, params as never[]);
        return { rows: r.rows as QueryRow[], rowCount: r.rowCount, command: r.command };
      };
      const out = await fn(exec);
      await client.query('commit');
      return out;
    } catch (err) {
      await client.query('rollback').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.pool) await this.pool.end();
  }

  // ── internals ───────────────────────────────────────────────────────────────

  private async apiExecute(sql: string, params: unknown[]): Promise<QueryResult> {
    const single = sql.trim().replace(/;+\s*$/, '');
    const query = params.length ? inlineParams(single, params) : single;
    const rows = await this.mgmt!.runQuery(this.projectRef!, query);
    return { rows, rowCount: rows.length, command: null };
  }
}

function directPoolOptions(url: string): PoolConfig {
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    // keep empty — pg will surface the invalid URL
  }
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/.test(host);
  return {
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    // Supabase requires TLS; local dev databases do not.
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  };
}
