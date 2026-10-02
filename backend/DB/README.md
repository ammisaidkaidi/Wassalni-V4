# backend/DB — Supabase data layer (delivery domain v3)

TypeScript helpers to **connect**, **initialize** and **operate** the delivery-domain
PostgreSQL database on Supabase (schema = `data/init/sql.txt`, registry data =
`data/init/algeria.txt`).

```
backend/
├── data/init/                 # your assets (sql.txt, algeria.txt, env.txt)
├── DB/
│   ├── config.ts              # credentials & paths (.env → env vars → env.txt fallback)
│   ├── connection.ts          # SupabaseConnection — unified SQL transport
│   ├── management-api.ts      # Supabase Management API client (sbp_ token → run SQL)
│   ├── DatabaseInitializer.ts # install sql.txt + call sp_import_algeria_data(algeria.txt)
│   ├── DBHelper.ts            # generic ops: listTables/Views/Columns + CRUD + CALL procs
│   ├── domain.ts              # typed wrappers: createTrip(), reserve(), pay… + DZ errors
│   ├── sql-utils.ts           # dollar-quote-aware SQL splitter + safe ident/literal helpers
│   ├── cli.ts                 # init | reset | status | tables | views | columns | select | demo
│   ├── index.ts               # re-exports
│   └── tests/                 # offline tests (no DB needed)
├── package.json / tsconfig.json / .env.example / .gitignore
```

## Quick start

```bash
cd backend
npm install
cp .env.example .env          # then edit (see below)
npm run db:init               # install schema + Algeria registry
npm run db:demo               # end-to-end demo (create_trip → publish → reserve)
```

## Connection modes (both work with every helper — same API)

| | Mode A: `DATABASE_URL` (preferred) | Mode B: Management API (fallback) |
|---|---|---|
| What | direct Postgres via `pg` | `POST /v1/projects/{ref}/database/query` |
| Needs | connection string (dashboard → Project Settings → Database) | only the `sbp_…` personal access token |
| Bind params | real server-side `$1` params | safely inlined as SQL literals |
| Transactions | ✔ (`connection.transaction()`) | ✘ (one statement per round-trip) |
| Speed | fastest | fine for CLI / occasional ops |

If `DATABASE_URL` is set it wins; otherwise the Management API is used. The token is
read from `SUPABASE_ACCESS_TOKEN` (env) or extracted from `data/init/env.txt`, and the
project from `SUPABASE_PROJECT_REF` (auto-detected when the token has exactly one project).

> Current setup: **wassalni** (`lkvhzqdswprogoazbwec`) via Management API — see `backend/.env`.

## CLI

```bash
npm run db -- init [--schema-only|--data-only|--force]  # install schema + Algeria data
npm run db -- reset                                     # ⚠ drop schema public, reinstall v3 + data
npm run db -- status                                    # counts + last import_log
npm run db -- tables | views | columns <table>
npm run db -- select trip 5 --where status=scheduled
npm run db -- demo                                      # full trip lifecycle
npm run test:utils                                      # offline tests (SQL splitter, CRUD builder)
npm run typecheck
```

## Usage from code

```ts
import { loadDbConfig, SupabaseConnection, DatabaseInitializer, DBHelper, DomainRepository } from './DB';

const conn = new SupabaseConnection(loadDbConfig());
await new DatabaseInitializer(conn, loadDbConfig()).initialize();   // idempotent

const db = new DBHelper(conn);
const repo = new DomainRepository(db);

// ── generic CRUD ──────────────────────────────────────────────
const tables = await db.listTables();
const trips  = await db.select('v_trip', { where: { status: 'scheduled' }, limit: 10 });
const row    = await db.insert('driver', { full_name: 'Karim', nin: '…18 digits…', phone: '+213…' });
await db.update('vehicle', { seats: 19 }, { id: '…' });
await db.delete('reservation', { id: '…' });          // refuses empty where clauses

// ── domain procedures / functions (typed) ─────────────────────
const tripId = await repo.createTrip({
  trajectoryId, departureAt: new Date('2026-10-10T08:00:00Z'),
  capacity: 20, seatPrice: 0, driverId, vehicleId,
});
await repo.populateTripStops(tripId);
await repo.publishTrip(tripId);                        // requires driver_id
await repo.populateTripPricesFromDefaults(tripId);
const resId = await repo.reserve({ tripId, customerId, seats: 2, pickupWpointId, dropoffWpointId });
const payId = await repo.recordPayment({ reservationId: resId, amount: 5000, method: 'cib' });
await repo.settlePayment(payId);

// direct calls to any procedure/function not wrapped above:
await db.callProcedure('sp_set_trip_price', tripId, fromWp, toWp, 1500);
const dairas = await db.callFunction('get_dairas', 'Alger');
```

Domain errors raised by the SQL layer carry `SQLSTATE DZxxx`; map them with
`explainDomainError(err)` or browse `repo.getDomainErrors()` (mirrors `v_domain_errors`).

## What was fixed in `data/init/sql.txt` (v3) to make it install

1. **`add_trip_stop`**: `raise exception 'Invalid stop', p_wpoint` — no `%`
   placeholder but one argument → `42601 too many parameters specified for RAISE`.
   Fixed to `'Invalid stop %'`.
2. **Section 16 seed**: the 69-wilaya seed used a different numbering and accented
   spellings than `algeria.txt` (e.g. seed id 65 = *El Abiodh Sidi Cheikh* while the
   JSON maps it to 60), so `sp_import_algeria_data`'s `ON CONFLICT (id)` upsert hit
   the `nom_fr` unique constraint (`23505`). The seed VALUES are now regenerated
   **from `algeria.txt`** (authoritative numbering), and imports are idempotent.

Current verified state of the project: schema v3 ✔, 69 wilayas / 591 dairas /
1541 communes ✔, demo trip + reservation ✔.

## Security notes

- These helpers connect as an admin (postgres owner / management token) — **server-side
  only**. Never ship them to the frontend; RLS does not apply to the owner role.
- `.env` and `data/init/env.txt` are git-ignored — keep it that way. Tokens that were
  pasted into chats/tools should be rotated (Supabase → Account → Access Tokens).
- `reset` drops **everything** in schema `public` (incl. PostGIS); `auth`/`storage`
  schemas and API keys are untouched.

## Caveats (Management API mode)

- No multi-statement transactions — `initialize()` runs the DDL statement-by-statement
  (the script is idempotent, so re-running after a failure is safe).
- The 412 KB algeria.txt import is a single request; if your network/token rejects it,
  set `DATABASE_URL` and run in direct mode.
