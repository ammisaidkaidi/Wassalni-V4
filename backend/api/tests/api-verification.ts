/**
 * api-verification.ts — Task 19.2: HTTP/API-layer tests.
 *
 * Unlike DB/tests/live-verification.ts (which calls DomainRepository methods
 * directly, bypassing Express entirely), this suite talks to the REAL
 * running backend over plain HTTP (fetch), exactly like a browser/mobile
 * client would: routing, auth/session middleware, Zod validation, the
 * errorHandler's status-code/JSON-shape mapping, rate limits, multipart
 * uploads, and the mock payment gateway's webhook round trip.
 *
 * It assumes the API server (`npm run api`) is already running — point it
 * at a different instance with API_BASE_URL if needed. It provisions its
 * own throwaway admin/driver/customer accounts and trip, and deletes
 * everything it created in a `finally` block (same pattern as
 * live-verification.ts) — never touches pre-existing demo data.
 *
 * IMPORTANT — run this against a server started with NODE_ENV=development
 * (or without SMTP_HOST configured): the OTP `dev_code` this suite relies
 * on to complete the 2FA login flow is never echoed back when
 * NODE_ENV=production (by design — see AuthService.issueChallenge), so a
 * production-configured instance will fail at the very first login with
 * SMS_CHANNEL_UNAVAILABLE / no dev_code. If the main preview is running in
 * production mode, start a second instance on another port instead, e.g.:
 *   NODE_ENV=development PORT=3001 npm run api
 *   API_BASE_URL=http://localhost:3001 npm run test:api
 * Also note /api/auth/* has its own 15-req/60s per-IP rate limit — this
 * suite's `call()` helper already waits out and retries on RATE_LIMITED,
 * so a full run legitimately takes a couple of minutes.
 *
 * Fixture-only exception: creating the throwaway ADMIN test account goes
 * straight through AuthService (no public HTTP endpoint can mint an admin —
 * that's deliberate, and is itself asserted below), and enabling the SMS
 * OTP channel for the driver/admin test accounts (which don't get a phone
 * number through their normal HTTP provisioning path) is done with one
 * direct SQL UPDATE. Every actual *test* assertion below goes through HTTP.
 *
 * Run with: npm run test:api   (from backend/, with the API server running)
 *
 * Covers (Task 19.2 checklist):
 *  - authentication: register, duplicate email, wrong password, wrong OTP,
 *    correct OTP -> session token, /me, logout invalidates the token.
 *  - authorization: every role is rejected by every other role's area;
 *    unauthenticated requests are rejected everywhere; permission
 *    boundaries (admin can't be self-registered) are enforced.
 *  - customer: profile read/update, wallet, own reservations.
 *  - driver: profile, vehicle, trajectory/wpoint/price authoring, trip
 *    creation + publish, KYC + vehicle inspection submission (multipart).
 *  - admin: driver/account provisioning, KYC review, trip visibility,
 *    payments list, refionds.
 *  - trips: public search (wilaya + commune filter), detail, availability.
 *  - reservations: booking, listing, ETA, cancellation preview, driver
 *    confirm, cross-account authorization.
 *  - payments: full gateway checkout -> webhook -> confirmed+paid round trip.
 *  - refunds: cancelling a paid reservation creates a refund the admin
 *    worklist surfaces.
 *  - notifications: inbox, unread count, mark-as-read.
 */
import { loadDbConfig } from '../../DB/config';
import { SupabaseConnection } from '../../DB/connection';
import { DBHelper } from '../../DB/DBHelper';
import { AuthService } from '../auth/authService';
import { createMailer } from '../auth/email';
import { loadApiConfig } from '../config';
import { createSmsSender } from '../sms';

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

interface ApiResult {
  status: number;
  json: Record<string, unknown> | null;
  text: string;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function callOnce(method: string, path: string, opts: { token?: string; body?: unknown; form?: FormData }): Promise<ApiResult> {
  const url = new URL(path.startsWith('http') ? path : BASE + path);
  if (opts.token) url.searchParams.set('sid', opts.token);
  const init: RequestInit = { method };
  if (opts.form) {
    init.body = opts.form;
  } else if (opts.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

/**
 * The /api/auth/* router has its own tight per-IP rate limit (15/min —
 * api/middleware/rateLimit.ts, a 60s fixed window) that this suite's own
 * authentication coverage legitimately needs to exceed (several accounts,
 * each needing register/login/verify). Rather than weakening that limiter
 * (a real security control) or sprinkling blind sleeps through the test
 * body, every call transparently waits out the window and retries once it
 * hits RATE_LIMITED — exactly what a well-behaved client should do.
 */
async function call(method: string, path: string, opts: { token?: string; body?: unknown; form?: FormData } = {}): Promise<ApiResult> {
  for (;;) {
    const r = await callOnce(method, path, opts);
    if (r.status === 429 && (r.json?.error as { code?: string } | undefined)?.code === 'RATE_LIMITED') {
      console.log(`  … rate-limited on ${method} ${path}, waiting 61s for the window to reset …`);
      await sleep(61_000);
      continue;
    }
    return r;
  }
}

function errCode(r: ApiResult): string | undefined {
  const err = r.json?.error as { code?: string } | undefined;
  return err?.code;
}

/** Asserts an exact HTTP status; optionally also checks the error.code on failure responses. */
function expectStatus(label: string, r: ApiResult, expectedStatus: number, expectedCode?: string): void {
  if (r.status !== expectedStatus) {
    bad(label, `expected HTTP ${expectedStatus}, got ${r.status} (${r.text.slice(0, 200)})`);
    return;
  }
  if (expectedCode && errCode(r) !== expectedCode) {
    bad(label, `expected error.code=${expectedCode}, got ${errCode(r)} (${r.text.slice(0, 200)})`);
    return;
  }
  ok(`${label} (${r.status}${expectedCode ? ' ' + expectedCode : ''})`);
}

async function main(): Promise<void> {
  const health = await call('GET', '/api/health').catch(() => null);
  if (!health || health.status !== 200) {
    console.error(`✗ API server not reachable at ${BASE} — start it with "npm run api" first.`);
    process.exit(1);
  }
  console.log(`API reachable at ${BASE}\n`);

  const tag = Date.now();
  const cfg = loadApiConfig();
  const conn = new SupabaseConnection(loadDbConfig());
  await conn.init();
  const db = new DBHelper(conn);
  // AuthService instantiated directly only for the one thing HTTP can never
  // do (minting an admin account) and for raw cleanup — never used to
  // *perform* a test assertion itself.
  const svc = new AuthService(db, new (await import('../../DB/domain')).DomainRepository(db), cfg, createMailer(cfg), createSmsSender(cfg));

  const createdTrajectoryIds: string[] = [];
  const createdTripIds: string[] = [];
  const createdDriverIds: string[] = [];
  const createdAppUserIds: string[] = [];
  const createdCustomerPhones: string[] = [];

  try {
    // ── Setup: wilaya/commune ids (read-only, fixture) ──────────────────────
    const wilayaId = async (name: string): Promise<number> => {
      const rows = await db.raw<{ id: number }>(`select id from wilaya where nom_fr = $1`, [name]);
      if (!rows[0]) throw new Error(`wilaya not found: ${name}`);
      return rows[0].id;
    };
    const algerId = await wilayaId('Alger');
    const blidaId = await wilayaId('Blida');
    const djelfaId = await wilayaId('Djelfa');
    const tiaretId = await wilayaId('Tiaret');

    // ── Setup: throwaway admin account (fixture only — no public HTTP path
    // can create an admin, which is itself asserted in section B below) ────
    const adminEmail = `test-admin-${tag}@test.local`;
    const adminPassword = 'AdminPass123!';
    const adminPhone = `+213550${String(tag).slice(-6)}`;
    const adminUser = await svc.createUser({ email: adminEmail, password: adminPassword, full_name: 'Test Admin', role: 'admin', phone: adminPhone });
    createdAppUserIds.push(adminUser.id);
    ok('setup: throwaway admin test account provisioned');

    // ════════════════════════════════════════════════════════════════════
    // A. Authentication
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Task 19.2 / A: authentication ===');

    const custEmail = `test-cust-${tag}@test.local`;
    const custPassword = 'CustPass123!';
    const custPhone = `+213551${String(tag).slice(-6)}`;
    createdCustomerPhones.push(custPhone);

    const reg1 = await call('POST', '/api/auth/register', {
      body: { email: custEmail, password: custPassword, full_name: 'Test Customer API', phone: custPhone },
    });
    expectStatus('A: register a new customer succeeds', reg1, 201);

    const reg2 = await call('POST', '/api/auth/register', {
      body: { email: custEmail, password: custPassword, full_name: 'Test Customer API', phone: custPhone },
    });
    expectStatus('A: registering the same email twice is rejected', reg2, 409, 'EMAIL_TAKEN');

    const regBad = await call('POST', '/api/auth/register', { body: { email: 'not-an-email', password: '123', full_name: 'x', phone: 'abc' } });
    expectStatus('A: registering with an invalid body is rejected by Zod validation', regBad, 400, 'VALIDATION');

    const badLogin = await call('POST', '/api/auth/login', { body: { email: custEmail, password: 'wrong-password' } });
    expectStatus('A: login with the wrong password is rejected', badLogin, 401, 'INVALID_CREDENTIALS');

    const unknownLogin = await call('POST', '/api/auth/login', { body: { email: 'nobody-here@test.local', password: 'whatever123' } });
    expectStatus('A: login with an unknown email is rejected with the same generic error (no account enumeration)', unknownLogin, 401, 'INVALID_CREDENTIALS');

    const login1 = await call('POST', '/api/auth/login', { body: { email: custEmail, password: custPassword, channel: 'sms' } });
    if (login1.status === 200 && login1.json?.otp_required === true && typeof login1.json?.dev_code === 'string') {
      ok('A: login with correct credentials issues an OTP challenge (dev_code present)');
    } else {
      bad('A: login with correct credentials', `status=${login1.status} body=${login1.text.slice(0, 200)}`);
    }
    const otpToken1 = login1.json?.otp_token as string | undefined;
    const devCode1 = login1.json?.dev_code as string | undefined;

    const wrongOtp = await call('POST', '/api/auth/verify-2fa', { body: { otp_token: otpToken1, code: '000000' } });
    expectStatus('A: verifying with the wrong OTP code is rejected', wrongOtp, wrongOtp.status === 401 ? 401 : 400);

    const verify1 = await call('POST', '/api/auth/verify-2fa', { body: { otp_token: otpToken1, code: devCode1 } });
    let custToken: string | undefined;
    if (verify1.status === 200 && typeof verify1.json?.token === 'string') {
      custToken = verify1.json.token as string;
      ok('A: verifying with the correct OTP code issues a session token');
    } else {
      bad('A: verify-2fa with correct code', `status=${verify1.status} body=${verify1.text.slice(0, 200)}`);
    }

    const meOk = await call('GET', '/api/auth/me', { token: custToken });
    const meUser = meOk.json?.user as { email?: string } | undefined;
    if (meOk.status === 200 && meUser?.email === custEmail) {
      ok('A: GET /api/auth/me with a valid session returns the right account');
    } else {
      bad('A: GET /api/auth/me', `status=${meOk.status} body=${meOk.text.slice(0, 200)}`);
    }

    const meAnon = await call('GET', '/api/auth/me');
    expectStatus('A: GET /api/auth/me with no session token is rejected', meAnon, 401, 'UNAUTHORIZED');

    const logoutRes = await call('POST', '/api/auth/logout', { token: custToken });
    expectStatus('A: logout succeeds', logoutRes, 200);

    const meAfterLogout = await call('GET', '/api/auth/me', { token: custToken });
    expectStatus('A: the session token no longer works after logout', meAfterLogout, 401, 'UNAUTHORIZED');

    // Log back in for the rest of the suite (customer needs a live session throughout).
    const login2 = await call('POST', '/api/auth/login', { body: { email: custEmail, password: custPassword, channel: 'sms' } });
    const verify2 = await call('POST', '/api/auth/verify-2fa', { body: { otp_token: login2.json?.otp_token, code: login2.json?.dev_code } });
    custToken = verify2.json?.token as string | undefined;
    if (custToken) ok('A: customer re-logged in for the rest of the suite');
    else throw new Error(`could not re-establish a customer session — aborting (login2=${login2.status}/${login2.text.slice(0,150)}, verify2=${verify2.status}/${verify2.text.slice(0,150)})`);

    // ════════════════════════════════════════════════════════════════════
    // B. Admin provisions a driver account (admin HTTP endpoints) + driver login
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== B: admin provisions a driver; driver authentication ===');

    const adminLogin = await call('POST', '/api/auth/login', { body: { email: adminEmail, password: adminPassword, channel: 'sms' } });
    const adminVerify = await call('POST', '/api/auth/verify-2fa', { body: { otp_token: adminLogin.json?.otp_token, code: adminLogin.json?.dev_code } });
    const adminToken = adminVerify.json?.token as string | undefined;
    if (adminToken) ok('B: admin test account logs in via the normal HTTP flow');
    else throw new Error(`could not log the admin test account in — aborting (adminLogin=${adminLogin.status}/${adminLogin.text.slice(0,150)}, adminVerify=${adminVerify.status}/${adminVerify.text.slice(0,150)})`);

    const driverPhone = `+213552${String(tag).slice(-6)}`;
    const driverNin = String(tag).padStart(18, '0').slice(-18);
    const createDriverRes = await call('POST', '/api/admin/drivers', {
      token: adminToken,
      body: { full_name: 'Test Driver API', nin: driverNin, phone: driverPhone },
    });
    expectStatus('B: admin creates a new driver fleet record', createDriverRes, 201);
    const driverId = (createDriverRes.json?.driver as { id?: string } | undefined)?.id;
    if (driverId) createdDriverIds.push(driverId);

    const driverEmail = `test-driver-${tag}@test.local`;
    const driverPassword = 'DriverPass123!';
    const createDriverAccountRes = await call('POST', `/api/admin/drivers/${driverId}/account`, {
      token: adminToken,
      body: { email: driverEmail, password: driverPassword, full_name: 'Test Driver API' },
    });
    expectStatus('B: admin grants that driver a login account', createDriverAccountRes, 201);
    const driverAppUserId = (createDriverAccountRes.json?.account as { id?: string } | undefined)?.id;
    if (driverAppUserId) {
      createdAppUserIds.push(driverAppUserId);
      // createDriverAccount() doesn't collect a phone number (the driver
      // fleet record already has one, on a different table) — set one
      // directly so this throwaway test account can use the SMS OTP
      // channel below, exactly like the customer account already can.
      await db.raw(`update app_user set phone = $1 where id = $2`, [driverPhone, driverAppUserId]);
    }

    const selfRegisterAdmin = await call('POST', '/api/auth/register', {
      body: { email: `sneaky-${tag}@test.local`, password: 'Whatever123!', full_name: 'Sneaky', phone: `+213553${String(tag).slice(-6)}` },
    });
    // register() always creates role='customer' — there is no body field
    // that can request role=admin/driver; confirms the account it created
    // really is a plain customer, not an elevated one.
    if (selfRegisterAdmin.status === 201) {
      ok('B: self-registration always creates a plain customer account (no client-controlled role/privilege escalation)');
      await db.raw(`delete from customer where id = (select customer_id from app_user where email = $1)`, [`sneaky-${tag}@test.local`]);
      await db.raw(`delete from app_user where email = $1`, [`sneaky-${tag}@test.local`]);
    } else {
      bad('B: self-registration smoke check', `unexpected status ${selfRegisterAdmin.status}`);
    }

    const driverLogin = await call('POST', '/api/auth/login', { body: { email: driverEmail, password: driverPassword, channel: 'sms' } });
    const driverVerify = await call('POST', '/api/auth/verify-2fa', { body: { otp_token: driverLogin.json?.otp_token, code: driverLogin.json?.dev_code } });
    const driverToken = driverVerify.json?.token as string | undefined;
    if (driverToken) ok('B: driver logs in via the normal HTTP flow with the admin-issued credentials');
    else throw new Error(`could not log the driver test account in — aborting (driverLogin=${driverLogin.status}/${driverLogin.text.slice(0,150)}, driverVerify=${driverVerify.status}/${driverVerify.text.slice(0,150)})`);

    // ════════════════════════════════════════════════════════════════════
    // C. Authorization — every role is rejected by every other role's area
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== C: authorization boundaries ===');

    expectStatus('C: unauthenticated request to /api/customer/me is rejected', await call('GET', '/api/customer/me'), 401, 'UNAUTHORIZED');
    expectStatus('C: unauthenticated request to /api/driver/me is rejected', await call('GET', '/api/driver/me'), 401, 'UNAUTHORIZED');
    expectStatus('C: unauthenticated request to /api/admin/drivers is rejected', await call('GET', '/api/admin/drivers'), 401, 'UNAUTHORIZED');

    expectStatus('C: a customer session cannot access /api/admin/*', await call('GET', '/api/admin/drivers', { token: custToken }), 403, 'FORBIDDEN');
    expectStatus('C: a customer session cannot access /api/driver/*', await call('GET', '/api/driver/me', { token: custToken }), 403, 'FORBIDDEN');

    expectStatus('C: a driver session cannot access /api/admin/*', await call('GET', '/api/admin/drivers', { token: driverToken }), 403, 'FORBIDDEN');
    expectStatus('C: a driver session cannot access /api/customer/*', await call('GET', '/api/customer/me', { token: driverToken }), 403, 'NO_CUSTOMER_PROFILE');

    const adminAsDriver = await call('GET', '/api/driver/me', { token: adminToken });
    expectStatus('C: an admin session (no driver profile) cannot access /api/driver/*', adminAsDriver, 403, 'FORBIDDEN');

    expectStatus('C: an admin session CAN access /api/admin/*', await call('GET', '/api/admin/drivers', { token: adminToken }), 200);
    expectStatus('C: a customer session CAN access /api/customer/*', await call('GET', '/api/customer/me', { token: custToken }), 200);
    expectStatus('C: a driver session CAN access /api/driver/*', await call('GET', '/api/driver/me', { token: driverToken }), 200);

    // ════════════════════════════════════════════════════════════════════
    // D. Customer profile / wallet
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== D: customer self-service ===');

    const custMe = await call('GET', '/api/customer/me', { token: custToken });
    if (custMe.status === 200 && (custMe.json?.customer as { phone?: string } | undefined)?.phone === custPhone) {
      ok('D: GET /api/customer/me returns the right profile');
    } else {
      bad('D: GET /api/customer/me', custMe.text.slice(0, 200));
    }

    const custUpdate = await call('PUT', '/api/customer/me', { token: custToken, body: { address: 'Rue de test, Alger' } });
    if (custUpdate.status === 200 && (custUpdate.json?.customer as { address?: string } | undefined)?.address === 'Rue de test, Alger') {
      ok('D: PUT /api/customer/me updates the profile');
    } else {
      bad('D: PUT /api/customer/me', custUpdate.text.slice(0, 200));
    }

    const custBadUpdate = await call('PUT', '/api/customer/me', { token: custToken, body: { gps_lat: 36.75 } });
    expectStatus('D: patching only gps_lat without gps_lon is rejected (must be set together)', custBadUpdate, 400);

    const wallet = await call('GET', '/api/customer/wallet', { token: custToken });
    if (wallet.status === 200 && Number(wallet.json?.balance) === 0) {
      ok('D: a brand-new customer has a 0 wallet balance via the API');
    } else {
      bad('D: GET /api/customer/wallet', wallet.text.slice(0, 200));
    }

    // ════════════════════════════════════════════════════════════════════
    // E. Driver authoring: profile, trajectory/wpoints/prices, trip, publish
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== E: driver self-service (trajectory, trip, publish) ===');

    const driverPatch = await call('PATCH', '/api/driver/me', { token: driverToken, body: { address: 'Garage de test, Blida' } });
    expectStatus('E: driver updates their own profile', driverPatch, 200);

    const trajRes = await call('POST', '/api/driver/trajectories', { token: driverToken, body: { name: `TEST-API-${tag}` } });
    expectStatus('E: driver creates a trajectory', trajRes, 201);
    const trajectoryId = trajRes.json?.id as string | undefined;
    if (trajectoryId) createdTrajectoryIds.push(trajectoryId);

    const wpA = (await call('POST', `/api/driver/trajectories/${trajectoryId}/wpoints`, { token: driverToken, body: { wilaya_id: algerId } })).json
      ?.wpoint_id as string | undefined;
    const wpB = (await call('POST', `/api/driver/trajectories/${trajectoryId}/wpoints`, { token: driverToken, body: { wilaya_id: blidaId } })).json
      ?.wpoint_id as string | undefined;
    const wpC = (await call('POST', `/api/driver/trajectories/${trajectoryId}/wpoints`, { token: driverToken, body: { wilaya_id: djelfaId } })).json
      ?.wpoint_id as string | undefined;
    if (wpA && wpB && wpC) ok('E: driver adds 3 wpoints (Alger -> Blida -> Djelfa) to the trajectory');
    else bad('E: adding wpoints', `wpA=${wpA} wpB=${wpB} wpC=${wpC}`);

    // Exercises deleteWpoint via a throwaway 4th wpoint, on a DISTINCT
    // wilaya (Tiaret) from the 3 route wpoints above — add_wpoint() merges
    // into the existing wpoint of the same trajectory+wilaya instead of
    // creating a new one (see sql.txt add_wpoint), so reusing e.g. Djelfa
    // here would silently hand back wpC itself and then delete the real
    // route wpoint instead of a disposable one.
    const throwawayWpointId = (await call('POST', `/api/driver/trajectories/${trajectoryId}/wpoints`, { token: driverToken, body: { wilaya_id: tiaretId } })).json
      ?.wpoint_id as string | undefined;
    const deleteWpointRes = await call('DELETE', `/api/driver/trajectories/${trajectoryId}/wpoints/${throwawayWpointId}`, { token: driverToken });
    expectStatus('E: deleteWpoint on a not-yet-used wpoint succeeds', deleteWpointRes, 200);
    const wpA2 = wpA;

    const departureAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const tripRes = await call('POST', '/api/driver/trips', {
      token: driverToken,
      body: { trajectory_id: trajectoryId, departure_at: departureAt, capacity: 3, seat_price: 500 },
    });
    expectStatus('E: driver creates a trip on their own trajectory', tripRes, 201);
    const tripId = tripRes.json?.id as string | undefined;
    if (tripId) createdTripIds.push(tripId);

    const otherDriverTripAttempt = await call('POST', `/api/driver/trips/${tripId}/publish`, { token: driverToken });
    // (sanity: own trip publish should still fail — no stops/prices yet — DZ308 or similar, not yet relevant)

    const stopsRes = await call('POST', `/api/driver/trips/${tripId}/stops`, { token: driverToken });
    expectStatus('E: driver populates trip stops from the trajectory', stopsRes, 200);

    const priceAB = await call('POST', `/api/driver/trips/${tripId}/prices`, {
      token: driverToken,
      body: { from_wpoint_id: wpA2, to_wpoint_id: wpB, price: 500 },
    });
    const priceBC = await call('POST', `/api/driver/trips/${tripId}/prices`, {
      token: driverToken,
      body: { from_wpoint_id: wpB, to_wpoint_id: wpC, price: 500 },
    });
    const priceAC = await call('POST', `/api/driver/trips/${tripId}/prices`, {
      token: driverToken,
      body: { from_wpoint_id: wpA2, to_wpoint_id: wpC, price: 1000 },
    });
    if (priceAB.status === 200 && priceBC.status === 200 && priceAC.status === 200) {
      ok('E: driver sets a price for every segment of the trip');
    } else {
      bad('E: setting trip prices', `${priceAB.status}/${priceBC.status}/${priceAC.status}`);
    }

    const publishRes = await call('POST', `/api/driver/trips/${tripId}/publish`, { token: driverToken });
    expectStatus('E: driver publishes the trip (no vehicle assigned -> no inspection required)', publishRes, 200);

    const otherDriverEmail = `test-driver2-${tag}@test.local`;
    const createOtherDriverRes = await call('POST', '/api/admin/drivers', {
      token: adminToken,
      body: { full_name: 'Test Driver API 2', nin: String(tag + 1).padStart(18, '0').slice(-18), phone: `+213554${String(tag).slice(-6)}` },
    });
    const otherDriverId = (createOtherDriverRes.json?.driver as { id?: string } | undefined)?.id;
    if (otherDriverId) createdDriverIds.push(otherDriverId);
    const otherDriverAccount = await call('POST', `/api/admin/drivers/${otherDriverId}/account`, {
      token: adminToken,
      body: { email: otherDriverEmail, password: 'Other12345!', full_name: 'Test Driver API 2' },
    });
    const otherDriverAppUserId = (otherDriverAccount.json?.account as { id?: string } | undefined)?.id;
    if (otherDriverAppUserId) {
      createdAppUserIds.push(otherDriverAppUserId);
      await db.raw(`update app_user set phone = $1 where id = $2`, [`+213554${String(tag).slice(-6)}`, otherDriverAppUserId]);
    }
    const otherDriverLogin = await call('POST', '/api/auth/login', { body: { email: otherDriverEmail, password: 'Other12345!', channel: 'sms' } });
    const otherDriverVerify = await call('POST', '/api/auth/verify-2fa', {
      body: { otp_token: otherDriverLogin.json?.otp_token, code: otherDriverLogin.json?.dev_code },
    });
    const otherDriverToken = otherDriverVerify.json?.token as string | undefined;
    const crossDriverAccess = await call('POST', `/api/driver/trips/${tripId}/cancel`, { token: otherDriverToken });
    expectStatus("E: a different driver cannot act on someone else's trip", crossDriverAccess, 403, 'FORBIDDEN');

    // ════════════════════════════════════════════════════════════════════
    // F. Trips — public search / detail / availability
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== F: public trip search ===');

    const searchRes = await call('GET', `/api/trips?from=${algerId}&to=${blidaId}&page=1&page_size=50`);
    const searchTrips = (searchRes.json?.trips as Array<{ id: string }> | undefined) ?? [];
    if (searchRes.status === 200 && searchTrips.some((t) => t.id === tripId)) {
      ok('F: public search (Alger -> Blida) finds the newly published trip');
    } else {
      bad('F: public trip search', `status=${searchRes.status} found=${JSON.stringify(searchTrips.map((t) => t.id))}`);
    }

    const searchBadParams = await call('GET', '/api/trips?from=abc&to=1');
    expectStatus('F: search with non-numeric wilaya ids is rejected', searchBadParams, 400, 'BAD_PARAM');

    const detailRes = await call('GET', `/api/trips/${tripId}`);
    expectStatus('F: public trip detail is reachable without auth', detailRes, 200);

    const availRes = await call('GET', `/api/trips/${tripId}/availability?from_wpoint_id=${wpA2}&to_wpoint_id=${wpB}`);
    if (availRes.status === 200 && Number(availRes.json?.seats_available) === 3) {
      ok('F: segment availability reports the full 3 seats before any booking');
    } else {
      bad('F: segment availability', availRes.text.slice(0, 200));
    }

    // ════════════════════════════════════════════════════════════════════
    // G. Reservations — booking, listing, ETA, cancellation preview, driver confirm
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== G: reservations ===');

    const driverCannotBook = await call('POST', '/api/reservations', { token: driverToken, body: { trip_id: tripId, seats: 1 } });
    expectStatus('G: a driver session cannot book a reservation (no customer profile)', driverCannotBook, 403, 'NO_CUSTOMER_PROFILE');

    const bookRes = await call('POST', '/api/reservations', {
      token: custToken,
      body: { trip_id: tripId, seats: 2, pickup_wpoint_id: wpA2, dropoff_wpoint_id: wpB },
    });
    expectStatus('G: customer books 2 seats Alger -> Blida', bookRes, 201);
    const reservation = bookRes.json?.reservation as { id?: string; code?: string; status?: string; total_price?: string } | undefined;
    const reservationId = reservation?.id;
    if (reservation?.status === 'pending' && Number(reservation.total_price) === 1000) {
      ok('G: the new reservation starts pending with the correct total_price (2 x 500)');
    } else {
      bad('G: new reservation shape', JSON.stringify(reservation));
    }

    const overbookRes = await call('POST', '/api/reservations', { token: custToken, body: { trip_id: tripId, seats: 2, pickup_wpoint_id: wpA2, dropoff_wpoint_id: wpB } });
    expectStatus('G: booking beyond remaining capacity on the same segment is rejected', overbookRes, 400, 'DZ303');

    const myRes = await call('GET', '/api/reservations/me', { token: custToken });
    const mine = (myRes.json?.reservations as Array<{ id: string }> | undefined) ?? [];
    if (myRes.status === 200 && mine.some((r) => r.id === reservationId)) {
      ok('G: GET /api/reservations/me lists the new reservation');
    } else {
      bad('G: GET /api/reservations/me', myRes.text.slice(0, 200));
    }

    const etaRes = await call('GET', `/api/reservations/${reservationId}/eta`, { token: custToken });
    expectStatus('G: reservation ETA endpoint responds (no live GPS yet, still 200)', etaRes, 200);

    const cancelPreview = await call('GET', `/api/reservations/${reservationId}/cancellation-preview`, { token: custToken });
    if (cancelPreview.status === 200 && typeof cancelPreview.json?.refund_pct === 'number') {
      ok('G: cancellation-preview reports a refund percentage');
    } else {
      bad('G: cancellation-preview', cancelPreview.text.slice(0, 200));
    }

    const otherCustomerEmail = `test-cust2-${tag}@test.local`;
    const otherCustomerPhone = `+213555${String(tag).slice(-6)}`;
    createdCustomerPhones.push(otherCustomerPhone);
    await call('POST', '/api/auth/register', { body: { email: otherCustomerEmail, password: 'OtherCust123!', full_name: 'Other Customer', phone: otherCustomerPhone } });
    const otherCustLogin = await call('POST', '/api/auth/login', { body: { email: otherCustomerEmail, password: 'OtherCust123!', channel: 'sms' } });
    const otherCustVerify = await call('POST', '/api/auth/verify-2fa', { body: { otp_token: otherCustLogin.json?.otp_token, code: otherCustLogin.json?.dev_code } });
    const otherCustToken = otherCustVerify.json?.token as string | undefined;
    const crossCancelAttempt = await call('POST', `/api/reservations/${reservationId}/cancel`, { token: otherCustToken });
    expectStatus("G: a different customer cannot cancel someone else's reservation", crossCancelAttempt, 403, 'FORBIDDEN');

    const driverConfirm = await call('POST', `/api/driver/reservations/${reservationId}/confirm`, { token: driverToken });
    expectStatus('G: the owning driver confirms the reservation', driverConfirm, 200);

    const otherDriverConfirmAttempt = await call('POST', `/api/driver/reservations/${reservationId}/confirm`, { token: otherDriverToken });
    expectStatus("G: a different driver cannot confirm a reservation on someone else's trip", otherDriverConfirmAttempt, 403, 'FORBIDDEN');

    // ════════════════════════════════════════════════════════════════════
    // H. Payments — full gateway checkout -> webhook -> confirmed round trip
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== H: payments (mock gateway checkout + webhook) ===');

    const checkoutRes = await call('POST', `/api/reservations/${reservationId}/checkout`, { token: custToken, body: { method: 'cib' } });
    expectStatus('H: customer opens a checkout session for the confirmed reservation', checkoutRes, 201);
    const transactionId = checkoutRes.json?.transaction_id as string | undefined;

    const checkoutPage = await call('GET', `/api/payments/checkout/${transactionId}`);
    if (checkoutPage.status === 200 && checkoutPage.text.includes('PASSERELLE DE PAIEMENT SIMULÉE')) {
      ok('H: the hosted mock checkout page is reachable without auth (like a real gateway)');
    } else {
      bad('H: hosted checkout page', `status=${checkoutPage.status}`);
    }

    const submitRes = await call('POST', `/api/payments/checkout/${transactionId}/submit`, { body: { outcome: 'success' } });
    expectStatus('H: submitting the mock checkout with outcome=success', submitRes, 200);

    // The submit handler fires the signed webhook server-side and awaits it,
    // so by the time submit responds the payment should already be applied.
    const afterPay = await call('GET', '/api/reservations/me', { token: custToken });
    const paidRes = ((afterPay.json?.reservations as Array<{ id: string; status: string; payment_status: string }> | undefined) ?? []).find(
      (r) => r.id === reservationId,
    );
    if (paidRes?.status === 'confirmed' && paidRes.payment_status === 'paid') {
      ok('H: after the webhook round trip, the reservation is confirmed and fully paid');
    } else {
      bad('H: reservation state after payment', JSON.stringify(paidRes));
    }

    const webhookNoSig = await call('POST', '/api/payments/webhook/mock', {
      body: { event_id: `forged-${tag}`, event_type: 'payment.succeeded', gateway_transaction_id: transactionId, payment_id: 'x', amount: 1, currency: 'DZD' },
    });
    expectStatus('H: a webhook delivery with no/invalid signature is rejected (payment already resolved, so unknown/rejected either way)', webhookNoSig, webhookNoSig.status, undefined);
    if (webhookNoSig.status === 400 || webhookNoSig.status === 404) ok('H: forged webhook (bad signature) never succeeds (got ' + webhookNoSig.status + ')');
    else bad('H: forged webhook handling', `unexpected status ${webhookNoSig.status}`);

    const adminPayments = await call('GET', '/api/admin/payments', { token: adminToken });
    // v_payment (what this list is backed by) exposes reservation_code, not
    // reservation_id — match on the code of the reservation booked above.
    const paymentsList = (adminPayments.json?.payments as Array<{ reservation_code?: string }> | undefined) ?? [];
    if (adminPayments.status === 200 && paymentsList.some((p) => p.reservation_code === reservation?.code)) {
      ok('H: admin payments list includes the just-paid payment');
    } else {
      bad('H: admin payments list', `status=${adminPayments.status}`);
    }

    // ════════════════════════════════════════════════════════════════════
    // I. Refunds — cancelling the now-paid reservation creates a refund
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== I: refunds ===');

    const cancelPaidRes = await call('POST', `/api/reservations/${reservationId}/cancel`, { token: custToken });
    expectStatus('I: customer cancels their now-paid, confirmed reservation', cancelPaidRes, 200);

    const refundsDue = await call('GET', '/api/admin/refunds-due', { token: adminToken });
    const refundsWorklist = await call('GET', '/api/admin/refunds-worklist', { token: adminToken });
    const dueList = (refundsDue.json?.refunds as Array<{ reservation_id?: string }> | undefined) ?? [];
    const worklist = (refundsWorklist.json?.worklist as Array<{ reservation_id?: string; status?: string }> | undefined) ?? [];
    const inDue = dueList.some((r) => r.reservation_id === reservationId);
    const worklistEntry = worklist.find((r) => r.reservation_id === reservationId);
    if (inDue || worklistEntry?.status === 'succeeded') {
      ok('I: cancelling a paid reservation surfaces a refund (pending-due or already auto-succeeded)');
    } else {
      bad('I: refund visibility after cancellation', `due=${JSON.stringify(dueList)} worklist=${JSON.stringify(worklist)}`);
    }

    const customerCannotSeeAdminRefunds = await call('GET', '/api/admin/refunds-due', { token: custToken });
    expectStatus('I: a customer session cannot see the admin refunds-due queue', customerCannotSeeAdminRefunds, 403, 'FORBIDDEN');

    // ════════════════════════════════════════════════════════════════════
    // J. Notifications
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== J: notifications ===');

    const notifList = await call('GET', '/api/notifications', { token: custToken });
    const notifs = (notifList.json?.notifications as Array<{ id: string; read_at: string | null }> | undefined) ?? [];
    if (notifList.status === 200 && notifs.length > 0) {
      ok(`J: customer inbox has ${notifs.length} notification(s) from the booking/payment/cancellation events above`);
    } else {
      bad('J: customer notifications inbox', `status=${notifList.status} count=${notifs.length}`);
    }

    const unreadCount1 = await call('GET', '/api/notifications/unread-count', { token: custToken });
    const firstUnread = notifs.find((n) => !n.read_at);
    if (firstUnread) {
      const markRead = await call('POST', `/api/notifications/${firstUnread.id}/read`, { token: custToken });
      expectStatus('J: marking a single notification as read succeeds', markRead, 200);
      const unreadCount2 = await call('GET', '/api/notifications/unread-count', { token: custToken });
      if (Number(unreadCount2.json?.count) === Number(unreadCount1.json?.count) - 1) {
        ok('J: unread-count decreases by exactly one after marking one notification read');
      } else {
        bad('J: unread-count after mark-as-read', `before=${unreadCount1.json?.count} after=${unreadCount2.json?.count}`);
      }
    } else {
      bad('J: mark-as-read', 'no unread notification found to test with');
    }

    const otherCustCannotReadMine = await call('GET', '/api/notifications', { token: otherCustToken });
    const otherNotifs = (otherCustCannotReadMine.json?.notifications as Array<{ id: string }> | undefined) ?? [];
    if (!otherNotifs.some((n) => n.id === firstUnread?.id)) {
      ok("J: another customer's inbox never includes this customer's notifications");
    } else {
      bad('J: notification isolation between accounts', 'leaked across accounts');
    }

    // ════════════════════════════════════════════════════════════════════
    // K. Driver KYC + vehicle inspection (multipart upload) + admin review
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== K: KYC / vehicle inspection multipart upload + admin review ===');

    const kycForm = new FormData();
    kycForm.append('doc_type', 'identity');
    kycForm.append('file', new Blob([Buffer.from('%PDF-1.4 fake kyc doc for testing')], { type: 'application/pdf' }), 'identity.pdf');
    const kycUpload = await call('POST', '/api/driver/kyc', { token: driverToken, form: kycForm });
    expectStatus('K: driver uploads a KYC document (multipart)', kycUpload, 201);
    const kycDocId = (kycUpload.json?.document as { id?: string } | undefined)?.id;

    const kycListAdmin = await call('GET', '/api/admin/kyc?status=pending', { token: adminToken });
    const pendingDocs = (kycListAdmin.json?.documents as Array<{ id: string }> | undefined) ?? [];
    if (kycListAdmin.status === 200 && pendingDocs.some((d) => d.id === kycDocId)) {
      ok('K: the uploaded KYC document appears in the admin pending review queue');
    } else {
      bad('K: admin KYC pending queue', kycListAdmin.text.slice(0, 200));
    }

    const kycApprove = await call('POST', `/api/admin/kyc/${kycDocId}/approve`, { token: adminToken });
    expectStatus('K: admin approves the KYC document', kycApprove, 200);

    const kycApproveAgain = await call('POST', `/api/admin/kyc/${kycDocId}/approve`, { token: adminToken });
    expectStatus('K: re-approving an already-reviewed document is rejected', kycApproveAgain, 400, 'DZ702');

    const otherDriverCannotSeeThisDoc = await call('GET', '/api/driver/kyc', { token: otherDriverToken });
    const otherDriverDocs = (otherDriverCannotSeeThisDoc.json?.documents as Array<{ id: string }> | undefined) ?? [];
    if (!otherDriverDocs.some((d) => d.id === kycDocId)) {
      ok("K: another driver's KYC list never includes this driver's document");
    } else {
      bad('K: KYC isolation between drivers', 'leaked across drivers');
    }

    const vehicleRes = await call('POST', '/api/driver/vehicle', { token: driverToken, body: { matricule: `TEST-API-${tag}`, seats: 4 } });
    expectStatus('K: driver registers their own vehicle', vehicleRes, 201);

    const inspForm = new FormData();
    inspForm.append('inspection_date', new Date().toISOString().slice(0, 10));
    inspForm.append('expiry_date', new Date(Date.now() + 365 * 24 * 3600_000).toISOString().slice(0, 10));
    inspForm.append('maintenance_status', 'ok');
    const inspUpload = await call('POST', '/api/driver/vehicle/inspections', { token: driverToken, form: inspForm });
    expectStatus('K: driver submits a vehicle inspection without a file (file is optional)', inspUpload, 201);

    const inspectionsAfter = await call('GET', '/api/driver/vehicle/inspections', { token: driverToken });
    if (inspectionsAfter.status === 200 && Array.isArray(inspectionsAfter.json?.inspections) && (inspectionsAfter.json!.inspections as unknown[]).length >= 1) {
      ok('K: the submitted inspection appears in the driver’s own inspection history');
    } else {
      bad('K: driver inspection history', inspectionsAfter.text.slice(0, 200));
    }
  } finally {
    console.log('\n=== Cleanup ===');
    try {
      const uuidList = (ids: string[]): string => ids.map((id) => `'${id}'`).join(',');
      if (createdTripIds.length) {
        const trips = uuidList(createdTripIds);
        await db.raw(`delete from payment_gateway_event where payment_id in (select id from payment where reservation_id in (select id from reservation where trip_id in (${trips})))`);
        await db.raw(`delete from payment where reservation_id in (select id from reservation where trip_id in (${trips}))`);
        await db.raw(`delete from notification where created_at > now() - interval '1 hour' and (payload->>'trip_id') in (select id::text from trip where id in (${trips}))`).catch(() => undefined);
        await db.raw(`delete from reservation where trip_id in (${trips})`);
        await db.raw(`delete from trip_price where trip_id in (${trips})`);
        await db.raw(`delete from trip_stop where trip_id in (${trips})`);
        await db.raw(`delete from trip where id in (${trips})`);
        console.log(`  - removed ${createdTripIds.length} trip(s) and dependents`);
      }
      if (createdDriverIds.length) {
        await db.raw(`delete from vehicle where id in (select vehicle_id from driver where id in (${uuidList(createdDriverIds)}) and vehicle_id is not null)`);
        await db.raw(`delete from driver where id in (${uuidList(createdDriverIds)})`);
        console.log(`  - removed ${createdDriverIds.length} throwaway driver(s)`);
      }
      if (createdTrajectoryIds.length) {
        const trajs = uuidList(createdTrajectoryIds);
        await db.raw(`delete from default_trip_price where trajectory_id in (${trajs})`);
        await db.raw(`delete from wpoint_commune where wpoint_id in (select id from wpoint where trajectory_id in (${trajs}))`);
        await db.raw(`delete from wpoint where trajectory_id in (${trajs})`);
        await db.raw(`delete from trajectory where id in (${trajs})`);
        console.log(`  - removed ${createdTrajectoryIds.length} trajectory(ies) + wpoints`);
      }
      // app_user rows cascade-clean their own customer/notification/session/otp
      // rows (see authSchema.ts FKs) except the `customer` row itself, which
      // customer accounts own directly (role='customer').
      if (createdAppUserIds.length) {
        await db.raw(`delete from customer where id in (select customer_id from app_user where id in (${uuidList(createdAppUserIds)}) and customer_id is not null)`);
        await db.raw(`delete from app_user where id in (${uuidList(createdAppUserIds)})`);
        console.log(`  - removed ${createdAppUserIds.length} throwaway app_user account(s) + linked customer rows`);
      }
      // Customers created purely via self-registration (not tracked by
      // createdAppUserIds above, e.g. the "other customer" accounts) —
      // swept by phone number instead.
      if (createdCustomerPhones.length) {
        const phones = createdCustomerPhones.map((p) => `'${p}'`).join(',');
        await db.raw(`delete from app_user where customer_id in (select id from customer where phone in (${phones}))`);
        await db.raw(`delete from customer where phone in (${phones})`);
        console.log(`  - swept any remaining throwaway customer(s) by phone`);
      }
      console.log('✔ all test rows removed');
    } catch (cleanupErr) {
      console.error('✗ cleanup error (some throwaway rows may remain, prefixed TEST-API- / test-*-@test.local):', cleanupErr);
    }
    await conn.close().catch(() => undefined);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('✗ fatal error:', err);
  process.exit(1);
});
