/**
 * smoke.ts — Task 20.4: deployment smoke test.
 *
 * Deliberately NOT the same thing as api-verification.ts or
 * e2e-booking.ts: those are pre-deploy correctness suites that need a
 * NODE_ENV=development instance (dev_code) and create/clean up their own
 * throwaway fixtures. This is the opposite — a fast (~seconds), read-only,
 * fixture-free check meant to run directly against a just-deployed
 * PRODUCTION instance (or any environment) to answer one question: "is the
 * thing that's now live actually serving traffic correctly?" It creates
 * nothing and deletes nothing, so it's always safe to run against
 * production.
 *
 * Run with: npm run test:smoke   (defaults to http://localhost:3000; point
 * elsewhere with API_BASE_URL=https://your-deployed-host npm run test:smoke)
 */
const BASE = process.env.API_BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;
function ok(label: string): void {
  passed++;
  console.log(`✓ ${label}`);
}
function bad(label: string, detail: string): void {
  failed++;
  console.log(`✗ ${label} — ${detail}`);
}

async function main(): Promise<void> {
  console.log(`Smoke test against ${BASE}\n`);

  // 1. Liveness.
  try {
    const res = await fetch(`${BASE}/api/health`);
    const body = (await res.json()) as { ok?: boolean; db?: boolean };
    if (res.status === 200 && body.ok === true && body.db === true) {
      ok('API is up and reports the database reachable');
    } else {
      bad('health check', `status=${res.status} body=${JSON.stringify(body)}`);
    }
  } catch (err) {
    bad('health check', `request failed: ${err}`);
  }

  // 2. Public registry data actually loaded (Algeria wilayas) — catches a
  // deploy where the schema/seed step silently didn't run.
  try {
    const res = await fetch(`${BASE}/api/registry/wilayas`);
    const body = (await res.json()) as { wilayas?: unknown[] };
    if (res.status === 200 && Array.isArray(body.wilayas) && body.wilayas.length === 69) {
      ok(`registry data present (${body.wilayas.length} wilayas)`);
    } else {
      bad('registry wilayas', `status=${res.status} count=${Array.isArray(body.wilayas) ? body.wilayas.length : 'n/a'}`);
    }
  } catch (err) {
    bad('registry wilayas', `request failed: ${err}`);
  }

  // 3. Public trip search responds (no auth needed) — exercises DB → domain
  // → API end to end for a real read path. from/to are required params
  // (16=Alger, 9=Blida — stable seeded wilaya ids, same pair used by
  // api-verification.ts/e2e-booking.ts); an empty result list is a pass,
  // this only checks the route itself actually works.
  try {
    const res = await fetch(`${BASE}/api/trips?from=16&to=9&page=1&page_size=1`);
    const body = (await res.json()) as { trips?: unknown[] };
    if (res.status === 200 && Array.isArray(body.trips)) {
      ok('public trip search responds with a well-formed list');
    } else {
      bad('trip search', `status=${res.status} body=${JSON.stringify(body).slice(0, 200)}`);
    }
  } catch (err) {
    bad('trip search', `request failed: ${err}`);
  }

  // 4. Unknown route still gets the expected consistent error shape (Task 20.1).
  try {
    const res = await fetch(`${BASE}/api/this-route-does-not-exist`);
    const body = (await res.json()) as { error?: { code?: string } };
    if (res.status === 404 && body.error?.code === 'NOT_FOUND') {
      ok('unknown route returns the consistent 404 error shape');
    } else {
      bad('404 handling', `status=${res.status} body=${JSON.stringify(body)}`);
    }
  } catch (err) {
    bad('404 handling', `request failed: ${err}`);
  }

  // 5. Auth is actually enforced on a protected route (no session → 401, never a silent 200).
  try {
    const res = await fetch(`${BASE}/api/customer/me`);
    const body = (await res.json()) as { error?: { code?: string } };
    if (res.status === 401 && body.error?.code === 'UNAUTHORIZED') {
      ok('protected route correctly rejects an unauthenticated request');
    } else {
      bad('auth enforcement', `status=${res.status} body=${JSON.stringify(body)}`);
    }
  } catch (err) {
    bad('auth enforcement', `request failed: ${err}`);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('✗ fatal error:', err);
  process.exit(1);
});
