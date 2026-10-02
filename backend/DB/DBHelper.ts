import type { QueryResult, QueryRow, SupabaseConnection } from './connection';
import { quoteIdent } from './sql-utils';

export type Where = Record<string, unknown>;

export interface SelectOptions {
  /** Simple AND-equality filters: { status: 'scheduled', notes: null } → "status" = $1 and "notes" is null */
  where?: Where;
  /** Column whitelist; omit for *. */
  columns?: string[];
  /** e.g. "departure_at desc" or "name, code desc" (identifiers are validated). */
  orderBy?: string;
  limit?: number;
  offset?: number;
}

/**
 * DBHelper — generic database operations on top of SupabaseConnection:
 *
 *  - introspection : listTables / listViews / listColumns
 *  - CRUD          : select / selectOne / count / insert / insertMany /
 *                    update / upsert / delete / truncate
 *  - routines      : callProcedure (CALL sp_…) / callScalar (select f(…)) /
 *                    callFunction (select * from f(…))
 *
 * All table/column names are whitelist-validated (quoteIdent) and all values
 * are bound as parameters (direct mode) or safely inlined (management-api mode).
 */
export class DBHelper {
  constructor(readonly connection: SupabaseConnection) {}

  /** Run arbitrary parameterised SQL and return the rows. */
  async raw<T = QueryRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    return (await this.connection.execute(sql, params)).rows as T[];
  }

  // ── introspection ─────────────────────────────────────────────────────────

  async listTables(schema = 'public'): Promise<string[]> {
    const rows = await this.raw<{ tablename: string }>(
      'select tablename from pg_tables where schemaname = $1 order by tablename',
      [schema],
    );
    return rows.map((r) => r.tablename);
  }

  async listViews(schema = 'public'): Promise<string[]> {
    const rows = await this.raw<{ viewname: string }>(
      'select viewname from pg_views where schemaname = $1 order by viewname',
      [schema],
    );
    return rows.map((r) => r.viewname);
  }

  async listColumns(
    table: string,
    schema = 'public',
  ): Promise<
    Array<{
      ordinal_position: number;
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>
  > {
    return this.raw(
      `select ordinal_position, column_name, data_type, is_nullable, column_default
         from information_schema.columns
        where table_schema = $1 and table_name = $2
        order by ordinal_position`,
      [schema, table],
    );
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async select<T = QueryRow>(table: string, opts: SelectOptions = {}): Promise<T[]> {
    const cols = opts.columns && opts.columns.length ? opts.columns.map(quoteIdent).join(', ') : '*';
    const w = buildWhere(opts.where ?? {}, 0);
    const params = [...w.params];
    let sql = `select ${cols} from ${quoteIdent(table)}${w.clause}`;
    if (opts.orderBy) sql += ` order by ${buildOrderBy(opts.orderBy)}`;
    if (opts.limit !== undefined) {
      params.push(opts.limit);
      sql += ` limit $${params.length}`;
    }
    if (opts.offset !== undefined) {
      params.push(opts.offset);
      sql += ` offset $${params.length}`;
    }
    return (await this.connection.execute(sql, params)).rows as T[];
  }

  async selectOne<T = QueryRow>(table: string, opts: SelectOptions = {}): Promise<T | null> {
    const rows = await this.select<T>(table, { ...opts, limit: 1 });
    return rows[0] ?? null;
  }

  async count(table: string, where?: Where): Promise<number> {
    const w = buildWhere(where ?? {}, 0);
    const rows = await this.raw<{ count: number }>(
      `select count(*)::int as count from ${quoteIdent(table)}${w.clause}`,
      w.params,
    );
    return rows[0]?.count ?? 0;
  }

  async insert<T = QueryRow>(table: string, data: Record<string, unknown>): Promise<T> {
    const rows = await this.insertMany<T>(table, [data]);
    return rows[0];
  }

  async insertMany<T = QueryRow>(table: string, rows: Array<Record<string, unknown>>): Promise<T[]> {
    if (rows.length === 0) return [];
    const cols = Object.keys(rows[0]);
    if (rows.some((r) => Object.keys(r).length !== cols.length)) {
      throw new Error('insertMany: all rows must share the same columns');
    }
    const params: unknown[] = [];
    const tuples = rows.map(
      (row) =>
        `(${cols
          .map((c) => {
            params.push(row[c]);
            return `$${params.length}`;
          })
          .join(', ')})`,
    );
    const sql =
      `insert into ${quoteIdent(table)} (${cols.map(quoteIdent).join(', ')}) ` +
      `values ${tuples.join(', ')} returning *`;
    return (await this.connection.execute(sql, params)).rows as T[];
  }

  async update<T = QueryRow>(
    table: string,
    data: Record<string, unknown>,
    where: Where,
  ): Promise<T[]> {
    if (!where || Object.keys(where).length === 0) {
      throw new Error(`update(${table}): refusing to update without a where clause — use raw() if you really want that`);
    }
    if (!data || Object.keys(data).length === 0) throw new Error(`update(${table}): nothing to set`);
    const params: unknown[] = [];
    const sets = Object.entries(data).map(([col, val]) => {
      params.push(val);
      return `${quoteIdent(col)} = $${params.length}`;
    });
    const w = buildWhere(where, params.length);
    params.push(...w.params);
    const sql = `update ${quoteIdent(table)} set ${sets.join(', ')}${w.clause} returning *`;
    return (await this.connection.execute(sql, params)).rows as T[];
  }

  async upsert<T = QueryRow>(
    table: string,
    data: Record<string, unknown>,
    conflictColumns: string[],
  ): Promise<T> {
    if (!data || Object.keys(data).length === 0) throw new Error(`upsert(${table}): empty data`);
    if (conflictColumns.length === 0) throw new Error(`upsert(${table}): conflictColumns required`);
    const cols = Object.keys(data);
    const params = Object.values(data);
    const ph = params.map((_, i) => `$${i + 1}`);
    const updatables = cols.filter((c) => !conflictColumns.includes(c));
    const conflictAction =
      updatables.length > 0
        ? `do update set ${updatables.map((c) => `${quoteIdent(c)} = excluded.${quoteIdent(c)}`).join(', ')}`
        : 'do nothing';
    const sql =
      `insert into ${quoteIdent(table)} (${cols.map(quoteIdent).join(', ')}) values (${ph.join(', ')}) ` +
      `on conflict (${conflictColumns.map(quoteIdent).join(', ')}) ${conflictAction} returning *`;
    return (await this.connection.execute(sql, params)).rows[0] as T;
  }

  async delete<T = QueryRow>(table: string, where: Where): Promise<T[]> {
    if (!where || Object.keys(where).length === 0) {
      throw new Error(`delete(${table}): refusing to delete without a where clause — use raw() if you really want that`);
    }
    const w = buildWhere(where, 0);
    const sql = `delete from ${quoteIdent(table)}${w.clause} returning *`;
    return (await this.connection.execute(sql, w.params)).rows as T[];
  }

  async truncate(table: string, cascade = false): Promise<void> {
    await this.connection.execute(`truncate table ${quoteIdent(table)}${cascade ? ' cascade' : ''}`);
  }

  // ── stored procedures & functions ─────────────────────────────────────────

  /** CALL a stored procedure, e.g. callProcedure('sp_publish_trip', tripId). */
  async callProcedure(name: string, ...args: unknown[]): Promise<void> {
    const { sql, params } = callSignature('call', name, args);
    await this.connection.execute(sql, params);
  }

  /** `select f(args)` — for scalar AND void-returning functions (e.g. start_trip). */
  async callScalar<T = unknown>(name: string, ...args: unknown[]): Promise<T | null> {
    const { sql, params } = callSignature('select', name, args);
    const res = await this.connection.execute(sql, params);
    const first = res.rows[0];
    return first ? (Object.values(first)[0] as T) : null;
  }

  /** `select * from f(args)` — for table / set-returning functions (e.g. get_dairas). */
  async callFunction<T = QueryRow>(name: string, ...args: unknown[]): Promise<T[]> {
    const { sql, params } = callSignature('select * from', name, args);
    return (await this.connection.execute(sql, params)).rows as T[];
  }
}

// ── internal SQL builders ─────────────────────────────────────────────────────

function buildWhere(where: Where, startIndex: number): { clause: string; params: unknown[] } {
  const params: unknown[] = [];
  const entries = Object.entries(where);
  if (entries.length === 0) return { clause: '', params };
  const parts = entries.map(([col, val]) => {
    const ident = quoteIdent(col);
    if (val === null) return `${ident} is null`;
    params.push(val);
    return `${ident} = $${startIndex + params.length}`;
  });
  return { clause: ` where ${parts.join(' and ')}`, params };
}

function buildOrderBy(orderBy: string): string {
  return orderBy
    .split(',')
    .map((part) => {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_.]*)\s*(asc|desc)?\s*$/i.exec(part);
      if (!m) throw new Error(`Invalid orderBy fragment: ${JSON.stringify(part)}`);
      return `${quoteIdent(m[1])}${m[2] ? ` ${m[2].toLowerCase()}` : ''}`;
    })
    .join(', ');
}

function callSignature(
  prefix: 'call' | 'select' | 'select * from',
  name: string,
  args: unknown[],
): { sql: string; params: unknown[] } {
  const ident = quoteIdent(name);
  const params = args.map((a) => (a === undefined ? null : a));
  if (params.length === 0) return { sql: `${prefix} ${ident}()`, params };
  return { sql: `${prefix} ${ident}(${params.map((_, i) => `$${i + 1}`).join(', ')})`, params };
}
