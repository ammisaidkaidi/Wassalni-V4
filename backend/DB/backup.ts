/**
 * backup.ts — Task 18.1: our own logical backup/restore-verification engine.
 *
 * This is deliberately independent of whatever Supabase itself is (or isn't)
 * doing for this project (see getManagedBackupStatus in connection.ts /
 * backend/BACKUP_RECOVERY.md) — it is the one safety net we fully control
 * and can prove works, regardless of plan tier.
 *
 * Design:
 *  - createBackup(): dumps every public-schema base table to a single JSON
 *    file, plus a small sidecar manifest (id, row counts, sha256 checksum)
 *    used for fast listing/verification without re-reading the full dump.
 *  - verifyBackup(): read-only integrity check (checksum + row-count
 *    structural self-consistency), optionally compared against live table
 *    counts for drift — never touches the database when `db` is omitted.
 *  - restoreDrill(): the actual "can we really load this back into
 *    Postgres?" proof — restores every table's rows (as opaque jsonb blobs,
 *    so it works regardless of column types/enums/arrays) into an isolated
 *    scratch schema, counts them, then drops the scratch schema. Refuses to
 *    ever target 'public' — this is a verification drill, not a real
 *    restore path (see backend/BACKUP_RECOVERY.md for the real one).
 *  - pruneOldBackups(): deletes backups older than the retention window.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BACKEND_ROOT } from './config';
import type { DBHelper } from './DBHelper';
import { quoteIdent } from './sql-utils';

export const BACKUP_DIR = path.join(BACKEND_ROOT, 'data', 'backups');

export interface BackupManifest {
  id: string;
  createdAt: string;
  tables: string[];
  rowCounts: Record<string, number>;
  checksumSha256: string;
  dataFile: string;
  sizeBytes: number;
}

export interface BackupVerifyResult {
  id: string;
  ok: boolean;
  checksumOk: boolean;
  structureOk: boolean;
  ageHours: number;
  issues: string[];
  drift?: Record<string, { backup: number; live: number }>;
}

export interface RestoreDrillResult {
  id: string;
  schema: string;
  ok: boolean;
  durationMs: number;
  tables: Record<string, { expected: number; loaded: number; ok: boolean }>;
  issues: string[];
}

function ensureBackupDir(): void {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function sha256(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function manifestPath(id: string): string {
  return path.join(BACKUP_DIR, `${id}.manifest.json`);
}

function ageHoursOf(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
}

/** Every base table in `public` (same introspection query db.listTables() uses), newest-safe order doesn't matter — restoreDrill loads each table independently. */
async function defaultTables(db: DBHelper): Promise<string[]> {
  return db.listTables('public');
}

export async function createBackup(db: DBHelper, opts: { tables?: string[] } = {}): Promise<BackupManifest> {
  ensureBackupDir();
  const tables = opts.tables ?? (await defaultTables(db));
  const createdAt = new Date().toISOString();
  const id = `backup-${createdAt.replace(/[:.]/g, '-')}`;
  const payload: Record<string, unknown[]> = {};
  const rowCounts: Record<string, number> = {};
  for (const table of tables) {
    const rows = await db.raw(`select * from ${quoteIdent(table)}`);
    payload[table] = rows;
    rowCounts[table] = rows.length;
  }
  const dataFile = `${id}.json`;
  const json = JSON.stringify({ id, createdAt, tables, payload });
  fs.writeFileSync(path.join(BACKUP_DIR, dataFile), json, 'utf8');
  const checksumSha256 = sha256(fs.readFileSync(path.join(BACKUP_DIR, dataFile)));
  const manifest: BackupManifest = {
    id,
    createdAt,
    tables,
    rowCounts,
    checksumSha256,
    dataFile,
    sizeBytes: Buffer.byteLength(json),
  };
  fs.writeFileSync(manifestPath(id), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

export function listBackups(): BackupManifest[] {
  ensureBackupDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.manifest.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8')) as BackupManifest)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findBackup(id: string): BackupManifest {
  const manifest = listBackups().find((m) => m.id === id);
  if (!manifest) throw new Error(`Backup not found: ${id}`);
  return manifest;
}

/**
 * Read-only integrity check. Always verifies the file itself (checksum +
 * structural row-count self-consistency); additionally reports live-table
 * drift when `db` is supplied (informational, not a failure — row counts
 * naturally diverge between backup time and now).
 */
export async function verifyBackup(id: string, db?: DBHelper): Promise<BackupVerifyResult> {
  const manifest = findBackup(id);
  const fullPath = path.join(BACKUP_DIR, manifest.dataFile);
  const issues: string[] = [];
  const ageHours = ageHoursOf(manifest.createdAt);
  if (!fs.existsSync(fullPath)) {
    return { id, ok: false, checksumOk: false, structureOk: false, ageHours, issues: ['data file missing on disk'] };
  }
  const raw = fs.readFileSync(fullPath);
  const checksumOk = sha256(raw) === manifest.checksumSha256;
  if (!checksumOk) issues.push('checksum mismatch — backup file may be corrupted or tampered with');

  let structureOk = true;
  let parsed: { payload: Record<string, unknown[]> } | undefined;
  try {
    parsed = JSON.parse(raw.toString('utf8')) as { payload: Record<string, unknown[]> };
    for (const table of manifest.tables) {
      const rows = parsed.payload[table];
      if (!Array.isArray(rows) || rows.length !== manifest.rowCounts[table]) {
        structureOk = false;
        issues.push(`table "${table}": expected ${manifest.rowCounts[table]} rows, found ${Array.isArray(rows) ? rows.length : 'missing/invalid'}`);
      }
    }
  } catch (err) {
    structureOk = false;
    issues.push(`backup file is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  let drift: Record<string, { backup: number; live: number }> | undefined;
  if (db) {
    drift = {};
    for (const table of manifest.tables) {
      try {
        drift[table] = { backup: manifest.rowCounts[table], live: await db.count(table) };
      } catch {
        // Table may have been dropped/renamed since this backup was taken —
        // not itself a verification failure of the backup file.
      }
    }
  }

  return { id, ok: checksumOk && structureOk, checksumOk, structureOk, ageHours, issues, drift };
}

/**
 * The actual "prove it's restorable" drill: loads every table's rows (as
 * jsonb blobs, sidestepping column-type/enum/array fidelity — this proves
 * data integrity + loadability, not byte-for-byte schema reconstruction)
 * into an isolated scratch schema, verifies counts, then drops the schema.
 * Refuses outright to target 'public'.
 */
export async function restoreDrill(db: DBHelper, id: string, opts: { schema?: string } = {}): Promise<RestoreDrillResult> {
  const schema = opts.schema ?? 'backup_drill';
  if (schema === 'public') {
    throw new Error('Refusing to restore-drill into the "public" schema — this is a verification drill, not a real restore. Use a scratch schema.');
  }
  const manifest = findBackup(id);
  const fullPath = path.join(BACKUP_DIR, manifest.dataFile);
  const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as { payload: Record<string, unknown[]> };
  const started = Date.now();
  const issues: string[] = [];
  const tables: RestoreDrillResult['tables'] = {};

  await db.connection.execute(`drop schema if exists ${quoteIdent(schema)} cascade`);
  await db.connection.execute(`create schema ${quoteIdent(schema)}`);
  try {
    for (const table of manifest.tables) {
      const rows = parsed.payload[table] ?? [];
      const qualified = `${schema}.${table}`;
      await db.connection.execute(`create table ${quoteIdent(qualified)} (row_data jsonb not null)`);
      const CHUNK = 200;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK).map((r) => ({ row_data: r }));
        if (slice.length) await db.insertMany(qualified, slice);
      }
      const loaded = await db.count(qualified);
      const ok = loaded === rows.length;
      if (!ok) issues.push(`table "${table}": expected ${rows.length} rows loaded, got ${loaded}`);
      tables[table] = { expected: rows.length, loaded, ok };
    }
  } finally {
    await db.connection.execute(`drop schema if exists ${quoteIdent(schema)} cascade`);
  }

  return { id, schema, ok: issues.length === 0, durationMs: Date.now() - started, tables, issues };
}

/** Deletes local backups (data file + manifest) older than retentionDays. Returns the pruned ids. */
export function pruneOldBackups(retentionDays: number): string[] {
  ensureBackupDir();
  const cutoff = Date.now() - retentionDays * 86_400_000;
  const pruned: string[] = [];
  for (const manifest of listBackups()) {
    if (new Date(manifest.createdAt).getTime() < cutoff) {
      fs.rmSync(path.join(BACKUP_DIR, manifest.dataFile), { force: true });
      fs.rmSync(manifestPath(manifest.id), { force: true });
      pruned.push(manifest.id);
    }
  }
  return pruned;
}
