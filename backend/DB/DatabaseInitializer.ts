import * as fs from 'node:fs';
import type { SupabaseConnection } from './connection';
import { splitSqlStatements } from './sql-utils';

export interface SchemaReport {
  installed: boolean;
  /** Number of statements executed (0 when skipped). */
  statements: number;
  skipped: boolean;
}

export interface DataImportReport {
  /** Counts advertised by the JSON payload itself. */
  payload: { wilayas: number; dairas: number; communes: number };
  /** Actual row counts in the database after the import. */
  database: { wilayas: number; dairas: number; communes: number; importLogId: number | null };
  ok: boolean;
}

export interface InitializeReport {
  wasAlreadyInstalled: boolean;
  schema: SchemaReport;
  data: DataImportReport | null;
  warnings: string[];
}

export interface StatusReport {
  installed: boolean;
  counts: Record<string, number> | null;
  lastImport: Record<string, unknown> | null;
}

/**
 * DatabaseInitializer — installs the delivery-domain schema into Supabase:
 *
 *   1. runSchema()        → executes data/init/sql.txt (DDL: tables, functions,
 *                           procedures, triggers, views, RLS, seeds)
 *   2. importAlgeriaData()→ call sp_import_algeria_data(jsonb) with
 *                           data/init/algeria.txt (69 wilayas / 591 dairas /
 *                           1541 communes)
 *
 * Everything is idempotent: the DDL uses IF NOT EXISTS / CREATE OR REPLACE /
 * ON CONFLICT, so re-running `initialize()` is safe.
 */
export class DatabaseInitializer {
  constructor(
    private readonly conn: SupabaseConnection,
    private readonly paths: { sqlPath: string; algeriaDataPath: string },
    private readonly log: (msg: string) => void = () => {},
  ) {}

  /** True when the delivery-domain tables exist (checks for public.trip). */
  async isInstalled(): Promise<boolean> {
    const res = await this.conn.execute(`select to_regclass('public.trip') is not null as installed`);
    return res.rows[0]?.installed === true;
  }

  /**
   * ⚠ DANGEROUS — drops EVERYTHING in schema `public` of the project
   * (tables, views, functions, enums, PostGIS objects) and recreates the
   * schema empty with the standard Supabase grants. Call initialize() after.
   * auth/storage schemas and API keys are not touched.
   */
  async reset(): Promise<void> {
    this.log('Dropping schema public (cascade) + PostGIS and recreating it…');
    await this.conn.executeScript([
      'drop extension if exists postgis cascade',
      'drop extension if exists postgis_topology cascade',
      'drop schema public cascade',
      'create schema public',
      `do $$ begin
         grant usage on schema public to anon, authenticated, service_role;
         grant all on schema public to postgres, service_role;
       exception when undefined_object then null; end $$`,
    ]);
  }

  /** Execute the full DDL script (sql.txt), statement by statement. */
  async runSchema(): Promise<SchemaReport> {
    const script = fs.readFileSync(this.paths.sqlPath, 'utf8');
    const statements = splitSqlStatements(script);
    this.log(`Running schema: ${statements.length} statements from ${this.paths.sqlPath}`);
    const res = await this.conn.executeScript(statements, {
      onProgress: (p) => {
        if ((p.index + 1) % 25 === 0 || p.index + 1 === p.total) {
          this.log(`  … ${p.index + 1}/${p.total} ${p.statement === '(batched in one request)' ? '(batched)' : ''}`);
        }
      },
    });
    if (res.failures.length > 0) {
      throw new Error(`Schema: ${res.failures.length} statement(s) failed — first failure:\n${res.failures[0].error}`);
    }
    return { installed: true, statements: statements.length, skipped: false };
  }

  /** Import the Algeria administrative registry via sp_import_algeria_data. */
  async importAlgeriaData(): Promise<DataImportReport> {
    const raw = fs.readFileSync(this.paths.algeriaDataPath, 'utf8');
    const payload = JSON.parse(raw) as {
      nb_wilayas?: number;
      nb_dairas?: number;
      nb_communes?: number;
      wilayas?: unknown[];
    };
    if (!Array.isArray(payload.wilayas)) {
      throw new Error(`${this.paths.algeriaDataPath}: expected a "wilayas" array`);
    }
    const expected = {
      wilayas: payload.nb_wilayas ?? payload.wilayas.length,
      dairas: payload.nb_dairas ?? -1,
      communes: payload.nb_communes ?? -1,
    };
    this.log(
      `Importing Algeria registry (${expected.wilayas} wilayas / ${expected.dairas} dairas / ${expected.communes} communes)…`,
    );
    await this.conn.execute('call sp_import_algeria_data($1::jsonb)', [raw]);

    const res = await this.conn.execute(`
      select (select count(*) from wilaya)::int  as wilayas,
             (select count(*) from daira)::int   as dairas,
             (select count(*) from commune)::int as communes,
             (select max(id)::int from import_log) as "importLogId"`);
    const counts = res.rows[0] as {
      wilayas: number;
      dairas: number;
      communes: number;
      importLogId: number | null;
    };
    const ok =
      counts.wilayas >= expected.wilayas &&
      (expected.dairas < 0 || counts.dairas >= expected.dairas) &&
      (expected.communes < 0 || counts.communes >= expected.communes);
    return { payload: expected, database: counts, ok };
  }

  /**
   * Full initialisation: schema (sql.txt) + Algeria data (algeria.txt).
   * Skips the DDL when the schema is already installed unless `force` is set.
   */
  async initialize(
    opts: { schemaOnly?: boolean; dataOnly?: boolean; force?: boolean } = {},
  ): Promise<InitializeReport> {
    const warnings: string[] = [];
    const already = await this.isInstalled();

    let schema: SchemaReport;
    if (opts.dataOnly) {
      schema = { installed: already, statements: 0, skipped: true };
    } else if (already && !opts.force) {
      this.log('Schema already installed — skipping DDL (use --force to re-run).');
      schema = { installed: true, statements: 0, skipped: true };
    } else {
      schema = await this.runSchema();
    }

    let data: DataImportReport | null = null;
    if (!opts.schemaOnly) {
      data = await this.importAlgeriaData();
      if (!data.ok) {
        warnings.push(
          `Import counts differ from the payload expectations: ${JSON.stringify(data.database)} vs ${JSON.stringify(data.payload)}`,
        );
      }
    }

    return { wasAlreadyInstalled: already, schema, data, warnings };
  }

  /** Quick overview: installed?, row counts, last import_log entry. */
  async status(): Promise<StatusReport> {
    const installed = await this.isInstalled();
    if (!installed) return { installed, counts: null, lastImport: null };
    const res = await this.conn.execute(`
      select (select count(*) from pays)::int        as pays,
             (select count(*) from wilaya)::int      as wilaya,
             (select count(*) from daira)::int       as daira,
             (select count(*) from commune)::int     as commune,
             (select count(*) from trajectory)::int  as trajectory,
             (select count(*) from wpoint)::int      as wpoint,
             (select count(*) from driver)::int      as driver,
             (select count(*) from vehicle)::int     as vehicle,
             (select count(*) from customer)::int    as customer,
             (select count(*) from trip)::int        as trip,
             (select count(*) from reservation)::int as reservation,
             (select count(*) from payment)::int     as payment`);
    const last = await this.conn.execute(
      'select id, ran_at, nb_wilayas, nb_dairas, nb_communes, payload_bytes from import_log order by id desc limit 1',
    );
    return {
      installed,
      counts: res.rows[0] as Record<string, number>,
      lastImport: (last.rows[0] as Record<string, unknown>) ?? null,
    };
  }
}
