# Deployment Checklist — Wassalni backend (Phase 20 — Task 20.4)

This is the operational runbook run **before every production deploy** —
every step below maps to a real, runnable command in this repo; nothing
here is aspirational. Run them in order from `backend/`. A step that fails
means: stop, fix it, do not deploy.

---

## 1. Backend build

```
cd backend
npm ci
npm run typecheck   # tsc --noEmit — must be 0 errors
npm run build       # tsc → backend/dist/
```

`npm start` (`node dist/api/server.js`) is what production actually runs —
not `npm run api` (`ts-node`, used for local dev only). Confirm `dist/`
was actually produced and `npm start` boots against it before trusting the
build:

```
NODE_ENV=production PORT=3000 npm start
```

## 2. Frontend build

```
cd frontend
npm ci
npm run typecheck
npm run build        # vite build → frontend/dist/
```

Serve `frontend/dist/` from whatever static host/CDN/reverse-proxy fronts
production, proxying `/api/*` to the backend (same-origin, so no
`CORS_ORIGIN` is needed in the common deployment shape — see
`backend/api/config.ts`).

## 3. Database migration verification

There is no separate migration tool — `backend/data/init/sql.txt` is the
full, idempotent DDL (every `create table/function/trigger` is
`if not exists`/`or replace`), applied automatically and safely on every
boot by `ensureAuthSchema()`/`ensureDomainSchema()` (see `api/server.ts`).
Verify it actually matches what's live **before** pointing production at a
new schema version:

```
npm run db:status     # confirms which transport (direct/Management API) and which project
npm run db:tables     # lists every table Postgres currently has — diff against sql.txt expectations
npm run db:init       # safe to re-run any time: every statement is idempotent
```

If `db:init` ever reports an error partway through, the database is in a
partially-migrated state — do not deploy application code against it until
resolved (restore from the latest backup if needed, see §7).

## 4. Environment verification (Task 20.4)

```
npm run verify:env
```

Exits non-zero in `NODE_ENV=production` if any of these are missing/wrong
(each one is a real, previously-seen gap, not a hypothetical):
`DATABASE_URL`/`SUPABASE_ACCESS_TOKEN`, `COOKIE_SECURE`, `CORS_ORIGIN` (if
the frontend isn't same-origin), a real OTP delivery channel (`SMTP_HOST`
or `SMS_PROVIDER` — otherwise 2FA login codes go nowhere), persisted
`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (otherwise every push subscription
breaks on every restart), and `BACKUP_SCHEDULER_ENABLED`. See
`backend/api/scripts/verify-env.ts` for the full, current list — it is the
single source of truth, this document only summarizes it.

## 5. Smoke tests (Task 20.4)

Fast, read-only, safe to run against the actual production URL right after
it comes up:

```
API_BASE_URL=https://your-deployed-host npm run test:smoke
```

Checks: API + DB reachable, registry data actually seeded (69 wilayas),
public trip search works, unknown routes 404 consistently, a protected
route correctly rejects an unauthenticated request. All 5 must pass.

## 6. End-to-end test (Task 19.4)

The full correctness suites (`test:api`, `test:e2e`) need
`NODE_ENV=development` (OTP `dev_code` is only echoed outside production —
see `backend/api/tests/api-verification.ts`'s header for why). Run these
against a **staging** instance before promoting the same build to
production — never against production itself (they create and delete
throwaway fixture rows):

```
NODE_ENV=development PORT=3001 npm run api &            # staging instance
API_BASE_URL=http://localhost:3001 npm run test:api      # 79 checks — HTTP-level, every feature area
API_BASE_URL=http://localhost:3001 npm run test:e2e      # 42 checks — one continuous booking-to-rating narrative
```

Both must report `0 failed` and confirm cleanup removed every row they
created before a deploy is approved.

## 7. Rollback test (Task 20.4)

Two independent rollback paths — rehearse both, don't assume either works
untested the day it's actually needed:

**a) Application rollback (code only, data unaffected).** Standard git
revert + redeploy of the previous build:

```
git revert <bad-commit>         # or: git checkout <previous-tag> -- . && commit
npm run build                   # backend
npm run build                   # frontend
# redeploy dist/ + frontend/dist/ as usual
```

Safe by construction here because `sql.txt` is additive/idempotent
(`create table if not exists`, `create or replace function`) — rolling
back application code never needs a matching "down" migration, since
nothing is ever dropped by a forward migration in the first place. (A
schema change that *does* need to remove/rename a column is the one case
this does not cover — treat that as a deliberate, separately-planned
migration, not a routine deploy.)

**b) Data rollback (restore from backup).** This is Task 18.2's restore
path, exercised automatically every week by the restore-drill scheduler
(`api/server.ts`) and manually runnable any time:

```
npm run db -- backup:list                       # pick a backup id
npm run db -- backup:verify <id>                 # checksum + structural check
npm run db -- backup:restore-drill <id>          # proves it's actually loadable, into an isolated schema — never touches `public`
```

A real restore-to-production (not a drill) is intentionally **not** a
one-command script — see `backend/BACKUP_RECOVERY.md` §3 for the
full, deliberately-manual procedure (confirming scope, taking a
pre-restore snapshot of the current state, etc.) before ever restoring
over live data.

**Operational health after rollback** — confirm with:

```
curl https://your-deployed-host/api/health          # public: {ok, db, uptime_s}
# admin-only, requires a logged-in admin session (?sid=...):
curl "https://your-deployed-host/api/admin/health?sid=<admin session token>"
```

`/api/admin/health` (Task 20.3) reports DB latency, every background
scheduler's last-run/last-success/last-error with a `stale` flag (payment
expiry, trip lifecycle, push/SMS dispatch, backup, restore-drill), and
which payment/email/SMS/push providers are live vs. sandbox/mock —
the actual post-rollback operational picture, not just "the process
didn't crash".

---

## Summary checklist

- [ ] `npm run typecheck && npm run build` (backend) succeeds
- [ ] `npm run typecheck && npm run build` (frontend) succeeds
- [ ] `npm run db:status` / `npm run db:init` confirm the schema is current and idempotent
- [ ] `npm run verify:env` passes in `NODE_ENV=production`
- [ ] `npm run test:smoke` passes against the newly deployed instance
- [ ] `npm run test:api` and `npm run test:e2e` passed on staging before this build was promoted
- [ ] Rollback path (a) and (b) above are both known-good (rehearsed, not assumed)
- [ ] `/api/admin/health` reports `ok: true` with no stale schedulers post-deploy
