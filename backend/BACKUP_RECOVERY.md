# Backup & Recovery — Wassalni backend (Phase 18 — Tasks 18.1 / 18.2)

This is the operational runbook for backup policy, retention, restore, and
disaster-recovery verification for this project's Supabase Postgres
database. It is written against the **actual, currently-live state** of
this project, confirmed via the Supabase Management API
(`GET /v1/projects/{ref}/database/backups`, also exposed as
`npm run db -- backup:status` and `GET /api/admin/backups/status`) —
not an assumption:

```
Region: eu-west-2
WAL-G (physical backup / WAL archiving) enabled: true
PITR (Point-in-Time Recovery) enabled: FALSE
Supabase-managed backups on record: 0
```

**Bottom line: as of today, this project has ZERO Supabase-managed backup
coverage and NO PITR.** `walg_enabled: true` only means the underlying
infrastructure is wired for it — on the Free tier Supabase does not
actually run scheduled backups or retain WAL for PITR. This is normal for
a project at this stage, but it means **our own logical backup (below) is
currently the only safety net this database has.** Re-run
`npm run db -- backup:status` after any plan change — this document's
recommendations section explains what to do about it.

---

## 1. What we back up, and how (Task 18.1)

### 1.1 Our own logical backup (`backend/DB/backup.ts`)

A full logical dump of every base table in the `public` schema (52 tables
at the time of writing — driver/vehicle/trip/reservation/payment/
notification/SMS/audit data, the Algeria wilaya/daira/commune registry,
etc.), taken via the same dual-transport connection the rest of the app
uses (works identically whether the server is configured with a direct
`DATABASE_URL` or only a Supabase `SUPABASE_ACCESS_TOKEN`/Management API
token — no `pg_dump` binary required, which matters because this
environment has no direct shell access to the database host).

Each backup produces two files under `backend/data/backups/`
(git-ignored — see §5):

- `<id>.json` — the actual dump: `{ id, createdAt, tables, payload }`
  where `payload[table]` is the full row array for that table.
- `<id>.manifest.json` — a small sidecar: row counts per table, a SHA-256
  checksum of the data file, size, timestamp. Used for fast listing and
  integrity verification without re-reading the (potentially large) dump.

**How it runs:**

| Trigger | Command / endpoint |
|---|---|
| Automatic, nightly | `server.ts` unref'd `setInterval` (every 24h), only when `BACKUP_SCHEDULER_ENABLED` ≠ `false` |
| On demand (ops) | `npm run db -- backup:run` |
| On demand (admin UI/API) | `POST /api/admin/backups/run` (requires the `manage_backups` permission — granted to `admin`/`super_admin`, not `support`/`finance`/`operations`) |

Every automatic nightly run is **immediately followed by a self-verify**
(see §3) and a retention prune — a silently-broken backup is caught the
same night it happens, not the day it's actually needed.

### 1.2 Retention policy

- Local logical backups are kept **14 days** by default
  (`BACKUP_RETENTION_DAYS` in `backend/.env`, default `14`), pruned
  automatically after every scheduled nightly run.
- Prune manually: `npm run db -- backup:prune [days]` or
  `POST /api/admin/backups/prune { "retention_days": N }`.
- This 14-day local window is **not** the only retention that should
  exist in a real deployment — see §5 (off-instance storage) and the
  recommendation in §6 to enable Supabase's own backup retention once on
  a paid plan.

### 1.3 Restore procedure

There are two different "restore" operations, for two different
situations — **do not confuse them**:

**(a) Real disaster recovery — restore the actual production database.**
This is **not** something this application performs itself (there is no
`POST /api/admin/backups/restore-to-production` endpoint, intentionally —
see §4). The authoritative path depends on what's enabled when the
incident happens:

- **If Supabase PITR is enabled** (it currently is NOT — see the live
  status above): via the dashboard (Project → Database → Backups →
  restore to a point in time), or programmatically:
  ```bash
  curl -X POST "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/database/backups/restore-pitr" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"recovery_time_target_unix": <unix timestamp of the target point in time>}'
  ```
  This exact call is implemented (but never invoked by the app itself) as
  `SupabaseManagementApi.restorePitr()` in `backend/DB/management-api.ts`,
  so an operator has a tested, type-checked function to call from a
  one-off script during a real incident rather than hand-rolling curl
  under pressure.
- **If no managed backup/PITR exists** (today's actual situation): the
  only path is our own logical backup. Restore it into a **new** Supabase
  project (or a freshly-reset schema on the existing one, if the incident
  doesn't require a new project) by adapting `restoreDrill()` in
  `backend/DB/backup.ts` — point it at the real schema instead of a
  scratch one, and recreate each table with its real column types first
  (the drill intentionally uses a generic `jsonb` blob column instead —
  see §1.4 for why) using the existing DDL in
  `backend/data/init/sql.txt` / `backend/api/domainSchema.ts`, THEN load
  each table's rows from the backup's `payload`. In practice:
  1. `npm run db -- init --schema-only` against the new/reset target to
     recreate the full schema (tables, constraints, indexes) from
     scratch.
  2. Write a short one-off script (model it on `restoreDrill`) that reads
     the chosen backup's `<id>.json` and `insertMany()`s each table's
     `payload[table]` rows in FK-safe order (parents before children —
     e.g. `wilaya` → `daira` → `commune` → `trajectory`/`wpoint` →
     `driver`/`vehicle` → `trip` → `reservation` → …).
  3. Run the verification checklist in §3.3 before cutting traffic over.

**(b) Restore-drill — prove a backup is actually loadable (routine,
safe, non-destructive).** This is what the app *does* run regularly:
`restoreDrill()` creates an isolated scratch schema (`backup_drill` by
default), loads every table's rows as JSON blobs, checks the counts
match, then drops the schema — proving the backup file round-trips
through real Postgres without ever touching `public`. It:
- **Refuses outright** to target the `public` schema (hard-coded guard).
- Runs automatically **weekly** (`server.ts`, against the most recent
  local backup).
- Can be run on demand: `npm run db -- backup:restore-drill <id>
  [schema]` or `POST /api/admin/backups/:id/restore-drill`.

### 1.4 Why restore-drill uses jsonb blobs, not real columns

The drill's goal is "is this backup's data intact and loadable", not
"byte-for-byte schema reconstruction" — reconstructing every column's
exact type (enums, arrays, generated columns, defaults) from
`information_schema` reliably enough to safely `CREATE TABLE` is a much
larger and more fragile undertaking than the verification actually
needs, and gets this exercised safely and automatically every week
instead of being too fragile to run unattended. A **real** restore (§1.3a)
instead replays the project's own authoritative schema script
(`sql.txt`), which already has exact types, so this isn't a gap in the
real recovery path — only in how the routine drill proves loadability.

---

## 2. Backup verification procedure (Task 18.1)

Three layers, cheapest/most-frequent first:

1. **Checksum + structural self-check** (`verifyBackup()`, no DB needed):
   recomputes the SHA-256 of the data file against the manifest (catches
   corruption/tampering), and confirms every table's row array length
   matches the manifest's recorded count (catches truncated writes).
   Runs automatically right after every nightly backup.
2. **Live drift check** (`verifyBackup()` with a DB connection, used by
   the admin "verify" endpoint and `backup:verify`): additionally
   compares each table's backed-up row count against the *current* live
   count. This is informational, not pass/fail by itself (counts
   naturally change), but a huge unexpected drop is a red flag worth a
   human look.
3. **Restore drill** (`restoreDrill()`, §1.3b): the actual proof the
   backup data loads into real Postgres. Runs weekly automatically, and
   on demand.

All three were run against this project's live database while building
this feature (see Actions Taken log) — the full backup → verify →
restore-drill cycle passed cleanly across all 52 tables.

---

## 3. Point-in-time recovery (Task 18.2)

### 3.1 Current state (verified against the live project — see header)

**PITR is NOT enabled on this project.** Per Supabase's own documentation,
PITR is a paid add-on (Pro/Team/Enterprise + a Small compute add-on or
larger) that backs up WAL files roughly every 2 minutes (more often
under high write load), giving an RPO as low as ~2 minutes when it *is*
enabled. None of that is active today.

### 3.2 Recovery Point Objective (RPO)

| Scenario | RPO today | RPO if PITR enabled |
|---|---|---|
| Our own nightly logical backup only (current reality) | **up to 24h** of data loss in the worst case | n/a |
| Supabase PITR add-on | n/a | **~2 minutes** (Supabase's own stated worst case) |

**Recommendation:** given this app handles bookings and payments, a
24-hour RPO is not acceptable once it carries real traffic/money. The
action item is to enable the Supabase PITR add-on (or at minimum move to
a paid plan with daily managed backups) before go-live — see §6.
Until then, the nightly logical backup + its automated verification is
the best achievable mitigation from the application layer alone.

### 3.3 Recovery Time Objective (RTO) and restoration verification

Target: **≤ 4 hours** from incident declared to service restored, for a
database at today's scale (52 tables, a few thousand rows total — see
the manifest row counts in any recent backup for the current figure).
This assumes:
- Restoring via Supabase's dashboard PITR flow (if enabled) is the
  fastest path and should complete in well under an hour for a database
  this size.
- Restoring from our own logical backup (§1.3a) is slower (schema
  recreation + row-by-row reload) but has been empirically exercised:
  the restore-drill round-trip of all 52 tables / ~2,500 rows through the
  Management API transport took **~3.5 minutes** end-to-end (direct
  `DATABASE_URL` mode, with real transactions and bulk inserts, would be
  materially faster — the Management API's one-HTTP-round-trip-per-
  statement is the bottleneck, not Postgres itself).

**Post-restore verification checklist** (run after ANY real restore,
PITR or logical):
1. `npm run db -- status` — confirms connectivity and basic table counts.
2. Compare row counts against the manifest of the backup used (or the
   last known-good state before the incident) — flag any table whose
   count looks implausible for the restore point chosen.
3. Hit `GET /api/health` and confirm the API boots cleanly against the
   restored database (schema patches in `authSchema.ts`/`domainSchema.ts`
   are idempotent and will re-apply harmlessly if needed).
4. Once Phase 19 (Testing) exists, run the full domain/API test suite
   against the restored database before reopening it to traffic.
5. Spot-check a handful of recent reservations/payments/trips by hand
   against what's remembered/expected from just before the incident.

---

## 4. Why there is no "restore to production" button

`POST /api/admin/backups/run`, `/:id/verify`, and `/:id/restore-drill`
are all exposed to admins (gated by the `manage_backups` permission),
because they are safe: a backup is read-only w.r.t. production data, and
the restore-drill never touches `public`. **Restoring real data is
different** — it is irreversible, whole-database, and exactly the kind
of action a single compromised admin session or a well-intentioned
misclick must not be able to trigger with one HTTP request. It stays a
deliberate, manual, CLI/dashboard-driven operation performed by a human
following §1.3a, exactly like the project's existing posture elsewhere
(e.g. there is no "wipe all data" admin endpoint either).

---

## 5. Where backups live — and why that's not enough on its own

In this sandboxed environment, backups are written to local disk
(`backend/data/backups/`, git-ignored — these dumps contain real PII,
payment references, and OTP/session metadata and must never be
committed). **In a real production deployment, this directory must be
shipped to durable, off-instance object storage** (S3/GCS/Supabase
Storage/etc.) immediately after each backup completes — local server
disk is not itself durable backup storage (a lost/replaced instance
loses every local backup with it). No object-storage credentials are
configured in this sandbox, so that upload step is **not yet
implemented** — it is the single most important follow-up action before
relying on this backup path in production (see §6).

---

## 6. Action items / residual risk (read this before go-live)

1. **Enable Supabase PITR (or at least a paid plan with managed daily
   backups)** before handling real traffic/payments — today's RPO is
   24h, which is not acceptable for a booking/payments app. Re-run
   `npm run db -- backup:status` after any plan change to confirm.
2. **Ship local backups to off-instance object storage** — see §5. Until
   this exists, a lost server instance also loses every local backup;
   only the (currently nonexistent) Supabase-managed backups would
   survive that, which is itself the problem in #1.
3. Consider lowering the nightly backup interval (or adding an
   intra-day one) once real transaction volume makes a 24h gap
   materially risky, independent of #1.
4. Once Phase 19 (Testing) lands, wire its test suite into the
   post-restore verification checklist (§3.3 step 4) for real, not just
   as a forward reference.
