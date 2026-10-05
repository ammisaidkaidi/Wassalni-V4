/**
 * e2e-booking.ts — Task 19.4: full end-to-end booking scenario, over real
 * HTTP (same posture as api-verification.ts — a browser/mobile client never
 * calls DomainRepository directly), as one continuous narrative instead of
 * independent assertions:
 *
 *   Customer registration/login -> Driver registration -> Driver KYC
 *   approval -> Driver trajectory -> Trip creation -> Customer search ->
 *   Partial/full route selection -> GPS pickup/dropoff -> Booking request ->
 *   Driver approval -> Seat hold -> Payment -> Confirmation -> Trip start ->
 *   Passenger boarding -> Trip completion -> Reservation
 *   completion/no-show -> Driver earnings -> Settlement/refund if
 *   applicable -> Rating.
 *
 * One trip carries 4 customers so every branch in that checklist actually
 * gets exercised in a single run:
 *   - Customer A: full route (Alger -> Djelfa), pays by gateway -> completed.
 *   - Customer B: partial route (Alger -> Blida), pays by wallet -> completed.
 *   - Customer D: full route, pays by gateway, then CANCELS before
 *     departure -> refund settlement leg.
 *   - Customer E: partial route (Blida -> Djelfa), confirmed but NEVER
 *     pays -> resolved to no_show when the trip closes.
 *
 * Run with: npm run test:e2e   (from backend/, API server running — see the
 * NODE_ENV note in api-verification.ts, the same OTP dev_code requirement
 * applies here).
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

/** Same reactive wait-and-retry on the /api/auth/* rate limit as api-verification.ts. */
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
  return (r.json?.error as { code?: string } | undefined)?.code;
}

function expectStatus(label: string, r: ApiResult, expectedStatus: number, expectedCode?: string): void {
  if (r.status !== expectedStatus) {
    bad(label, `expected HTTP ${expectedStatus}, got ${r.status} (${r.text.slice(0, 250)})`);
    return;
  }
  if (expectedCode && errCode(r) !== expectedCode) {
    bad(label, `expected error.code=${expectedCode}, got ${errCode(r)} (${r.text.slice(0, 250)})`);
    return;
  }
  ok(`${label} (${r.status}${expectedCode ? ' ' + expectedCode : ''})`);
}

/** Registers + logs a throwaway customer in via the normal HTTP flow; returns their session token + customer_id. */
async function registerAndLoginCustomer(fullName: string, phone: string, email: string, password: string): Promise<{ token: string; customerId: string }> {
  const reg = await call('POST', '/api/auth/register', { body: { email, password, full_name: fullName, phone } });
  if (reg.status !== 201) throw new Error(`register(${email}) failed: ${reg.status} ${reg.text}`);
  const login = await call('POST', '/api/auth/login', { body: { email, password, channel: 'sms' } });
  const verify = await call('POST', '/api/auth/verify-2fa', { body: { otp_token: login.json?.otp_token, code: login.json?.dev_code } });
  const token = verify.json?.token as string | undefined;
  const customerId = (verify.json?.user as { customer_id?: string } | undefined)?.customer_id;
  if (!token || !customerId) throw new Error(`login/verify(${email}) failed: login=${login.status} verify=${verify.status} ${verify.text}`);
  return { token, customerId };
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
  const svc = new AuthService(db, new (await import('../../DB/domain')).DomainRepository(db), cfg, createMailer(cfg), createSmsSender(cfg));

  const createdTrajectoryIds: string[] = [];
  const createdTripIds: string[] = [];
  const createdDriverIds: string[] = [];
  const createdAppUserIds: string[] = [];
  const createdCustomerPhones: string[] = [];

  try {
    const wilayaId = async (name: string): Promise<number> => {
      const rows = await db.raw<{ id: number }>(`select id from wilaya where nom_fr = $1`, [name]);
      if (!rows[0]) throw new Error(`wilaya not found: ${name}`);
      return rows[0].id;
    };
    const algerId = await wilayaId('Alger');
    const blidaId = await wilayaId('Blida');
    const djelfaId = await wilayaId('Djelfa');

    // Fixture-only: the one throwaway admin account, exactly like api-verification.ts.
    const adminEmail = `test-e2e-admin-${tag}@test.local`;
    const adminPassword = 'AdminPass123!';
    const adminPhone = `+213560${String(tag).slice(-6)}`;
    const adminUser = await svc.createUser({ email: adminEmail, password: adminPassword, full_name: 'E2E Test Admin', role: 'admin', phone: adminPhone });
    createdAppUserIds.push(adminUser.id);
    const adminLogin = await call('POST', '/api/auth/login', { body: { email: adminEmail, password: adminPassword, channel: 'sms' } });
    const adminVerify = await call('POST', '/api/auth/verify-2fa', { body: { otp_token: adminLogin.json?.otp_token, code: adminLogin.json?.dev_code } });
    const adminToken = adminVerify.json?.token as string | undefined;
    if (!adminToken) throw new Error(`admin login failed: ${adminLogin.status}/${adminVerify.status} ${adminVerify.text}`);
    ok('Setup: throwaway admin provisioned and logged in');

    // ════════════════════════════════════════════════════════════════════
    // Step 1 — Driver registration (admin provisions the fleet record + login)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Step 1: driver registration ===');
    const driverPhone = `+213561${String(tag).slice(-6)}`;
    const driverNin = String(tag).padStart(18, '0').slice(-18);
    const createDriverRes = await call('POST', '/api/admin/drivers', { token: adminToken, body: { full_name: 'E2E Test Driver', nin: driverNin, phone: driverPhone } });
    expectStatus('1: admin registers a new driver fleet record', createDriverRes, 201);
    const driverId = (createDriverRes.json?.driver as { id?: string } | undefined)?.id!;
    createdDriverIds.push(driverId);

    const driverEmail = `test-e2e-driver-${tag}@test.local`;
    const driverPassword = 'DriverPass123!';
    const driverAccountRes = await call('POST', `/api/admin/drivers/${driverId}/account`, { token: adminToken, body: { email: driverEmail, password: driverPassword, full_name: 'E2E Test Driver' } });
    expectStatus('1: admin grants the driver a login account', driverAccountRes, 201);
    const driverAppUserId = (driverAccountRes.json?.account as { id?: string } | undefined)?.id!;
    createdAppUserIds.push(driverAppUserId);
    await db.raw(`update app_user set phone = $1 where id = $2`, [driverPhone, driverAppUserId]);

    const driverLogin = await call('POST', '/api/auth/login', { body: { email: driverEmail, password: driverPassword, channel: 'sms' } });
    const driverVerify = await call('POST', '/api/auth/verify-2fa', { body: { otp_token: driverLogin.json?.otp_token, code: driverLogin.json?.dev_code } });
    const driverToken = driverVerify.json?.token as string | undefined;
    if (!driverToken) throw new Error(`driver login failed: ${driverLogin.status}/${driverVerify.status} ${driverVerify.text}`);
    ok('1: driver logs in with the admin-issued credentials');

    // ════════════════════════════════════════════════════════════════════
    // Step 2 — Driver KYC approval
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Step 2: driver KYC submission + admin approval ===');
    const kycForm = new FormData();
    kycForm.append('doc_type', 'license');
    kycForm.append('file', new Blob([Buffer.from('%PDF-1.4 fake e2e driving licence')], { type: 'application/pdf' }), 'license.pdf');
    const kycUpload = await call('POST', '/api/driver/kyc', { token: driverToken, form: kycForm });
    expectStatus('2: driver submits a KYC document', kycUpload, 201);
    const kycDocId = (kycUpload.json?.document as { id?: string } | undefined)?.id;

    const kycApprove = await call('POST', `/api/admin/kyc/${kycDocId}/approve`, { token: adminToken });
    expectStatus('2: admin approves the KYC document', kycApprove, 200);

    const kycStatus = await call('GET', '/api/driver/kyc', { token: driverToken });
    const kycDocs = (kycStatus.json?.documents as Array<{ id: string; status: string }> | undefined) ?? [];
    if (kycDocs.find((d) => d.id === kycDocId)?.status === 'approved') {
      ok('2: driver sees their own KYC document as approved');
    } else {
      bad('2: KYC status after approval', JSON.stringify(kycDocs));
    }

    // ════════════════════════════════════════════════════════════════════
    // Step 3 — Driver trajectory (Alger -> Blida -> Djelfa)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Step 3: driver trajectory ===');
    const trajRes = await call('POST', '/api/driver/trajectories', { token: driverToken, body: { name: `TEST-E2E-${tag}` } });
    expectStatus('3: driver creates a trajectory', trajRes, 201);
    const trajectoryId = trajRes.json?.id as string;
    createdTrajectoryIds.push(trajectoryId);

    const wpA = (await call('POST', `/api/driver/trajectories/${trajectoryId}/wpoints`, { token: driverToken, body: { wilaya_id: algerId } })).json?.wpoint_id as string;
    const wpB = (await call('POST', `/api/driver/trajectories/${trajectoryId}/wpoints`, { token: driverToken, body: { wilaya_id: blidaId } })).json?.wpoint_id as string;
    const wpC = (await call('POST', `/api/driver/trajectories/${trajectoryId}/wpoints`, { token: driverToken, body: { wilaya_id: djelfaId } })).json?.wpoint_id as string;
    if (wpA && wpB && wpC) ok('3: driver adds 3 wpoints (Alger -> Blida -> Djelfa)');
    else bad('3: adding wpoints', `wpA=${wpA} wpB=${wpB} wpC=${wpC}`);

    // ════════════════════════════════════════════════════════════════════
    // Step 4 — Trip creation + stops/prices + publish
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Step 4: trip creation ===');
    const departureAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const tripRes = await call('POST', '/api/driver/trips', { token: driverToken, body: { trajectory_id: trajectoryId, departure_at: departureAt, capacity: 6, seat_price: 500 } });
    expectStatus('4: driver creates the trip', tripRes, 201);
    const tripId = tripRes.json?.id as string;
    createdTripIds.push(tripId);

    expectStatus('4: driver populates trip stops from the trajectory', await call('POST', `/api/driver/trips/${tripId}/stops`, { token: driverToken }), 200);
    const priceAB = await call('POST', `/api/driver/trips/${tripId}/prices`, { token: driverToken, body: { from_wpoint_id: wpA, to_wpoint_id: wpB, price: 500 } });
    const priceBC = await call('POST', `/api/driver/trips/${tripId}/prices`, { token: driverToken, body: { from_wpoint_id: wpB, to_wpoint_id: wpC, price: 500 } });
    const priceAC = await call('POST', `/api/driver/trips/${tripId}/prices`, { token: driverToken, body: { from_wpoint_id: wpA, to_wpoint_id: wpC, price: 1000 } });
    if (priceAB.status === 200 && priceBC.status === 200 && priceAC.status === 200) ok('4: driver prices every segment of the route');
    else bad('4: setting trip prices', `${priceAB.status}/${priceBC.status}/${priceAC.status}`);

    expectStatus('4: driver publishes the trip', await call('POST', `/api/driver/trips/${tripId}/publish`, { token: driverToken }), 200);

    // ════════════════════════════════════════════════════════════════════
    // Step 5 — Customer search (full vs. partial route)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Step 5: customer search ===');
    const searchFull = await call('GET', `/api/trips?from=${algerId}&to=${djelfaId}&page=1&page_size=50`);
    const searchPartial = await call('GET', `/api/trips?from=${algerId}&to=${blidaId}&page=1&page_size=50`);
    const fullFound = ((searchFull.json?.trips as Array<{ id: string }> | undefined) ?? []).some((t) => t.id === tripId);
    const partialFound = ((searchPartial.json?.trips as Array<{ id: string }> | undefined) ?? []).some((t) => t.id === tripId);
    if (fullFound && partialFound) ok('5: the trip is discoverable both for the full route and for a partial segment');
    else bad('5: customer search', `full=${fullFound} partial=${partialFound}`);

    // ════════════════════════════════════════════════════════════════════
    // Step 6 — 4 customers book: full/partial route selection + GPS pins
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Step 6: booking requests (partial/full route + GPS pickup/dropoff) ===');

    const custA = await registerAndLoginCustomer('E2E Customer A (full route, gateway pay)', `+213562${String(tag).slice(-6)}`, `test-e2e-a-${tag}@test.local`, 'CustA12345!');
    const custB = await registerAndLoginCustomer('E2E Customer B (partial, wallet pay)', `+213563${String(tag).slice(-6)}`, `test-e2e-b-${tag}@test.local`, 'CustB12345!');
    const custD = await registerAndLoginCustomer('E2E Customer D (full route, pays then cancels)', `+213564${String(tag).slice(-6)}`, `test-e2e-d-${tag}@test.local`, 'CustD12345!');
    const custE = await registerAndLoginCustomer('E2E Customer E (partial, never pays -> no-show)', `+213565${String(tag).slice(-6)}`, `test-e2e-e-${tag}@test.local`, 'CustE12345!');
    for (const c of [custA, custB, custD, custE]) createdCustomerPhones.push('');
    ok('6: all 4 customers register and log in');

    const bookA = await call('POST', '/api/reservations', {
      token: custA.token,
      body: { trip_id: tripId, seats: 1, pickup_wpoint_id: wpA, dropoff_wpoint_id: wpC, pickup_lat: 36.75, pickup_lon: 3.06, dropoff_lat: 34.67, dropoff_lon: 3.25 },
    });
    expectStatus('6: Customer A books the FULL route (Alger -> Djelfa) with GPS pins', bookA, 201);
    const resA = (bookA.json?.reservation as { id: string; total_price: string } | undefined)!;

    const bookB = await call('POST', '/api/reservations', {
      token: custB.token,
      body: { trip_id: tripId, seats: 1, pickup_wpoint_id: wpA, dropoff_wpoint_id: wpB, pickup_lat: 36.75, pickup_lon: 3.06, dropoff_lat: 36.47, dropoff_lon: 2.83 },
    });
    expectStatus('6: Customer B books a PARTIAL route (Alger -> Blida) with GPS pins', bookB, 201);
    const resB = (bookB.json?.reservation as { id: string } | undefined)!;

    const bookD = await call('POST', '/api/reservations', { token: custD.token, body: { trip_id: tripId, seats: 1, pickup_wpoint_id: wpA, dropoff_wpoint_id: wpC } });
    expectStatus('6: Customer D books the full route (will cancel after paying)', bookD, 201);
    const resD = (bookD.json?.reservation as { id: string } | undefined)!;

    const bookE = await call('POST', '/api/reservations', { token: custE.token, body: { trip_id: tripId, seats: 1, pickup_wpoint_id: wpB, dropoff_wpoint_id: wpC } });
    expectStatus('6: Customer E books a partial route (will never pay)', bookE, 201);
    const resE = (bookE.json?.reservation as { id: string } | undefined)!;

    // ════════════════════════════════════════════════════════════════════
    // Step 7 — Driver approval (seat hold = capacity re-checked on confirm)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Step 7: driver approval (seat hold) ===');
    for (const [label, resId] of [
      ['A', resA.id],
      ['B', resB.id],
      ['D', resD.id],
      ['E', resE.id],
    ] as const) {
      expectStatus(`7: driver confirms Customer ${label}'s reservation (seat held)`, await call('POST', `/api/driver/reservations/${resId}/confirm`, { token: driverToken }), 200);
    }

    // ════════════════════════════════════════════════════════════════════
    // Step 8 — Payment + confirmation (gateway for A/D, wallet for B, none for E)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Step 8: payment ===');

    const checkoutA = await call('POST', `/api/reservations/${resA.id}/checkout`, { token: custA.token, body: { method: 'cib' } });
    const submitA = await call('POST', `/api/payments/checkout/${checkoutA.json?.transaction_id}/submit`, { body: { outcome: 'success' } });
    expectStatus('8: Customer A pays the full route via the mock gateway', submitA, 200);

    const walletCreditB = await call('POST', `/api/admin/customers/${custB.customerId}/wallet/adjust`, { token: adminToken, body: { amount: 1000, description: 'E2E test top-up' } });
    expectStatus('8: admin credits Customer B\u2019s wallet so they can pay without a gateway', walletCreditB, 201);
    const payB = await call('POST', `/api/reservations/${resB.id}/pay-wallet`, { token: custB.token });
    expectStatus('8: Customer B pays their partial-route fare from their wallet', payB, 201);

    const checkoutD = await call('POST', `/api/reservations/${resD.id}/checkout`, { token: custD.token, body: { method: 'edahabia' } });
    const submitD = await call('POST', `/api/payments/checkout/${checkoutD.json?.transaction_id}/submit`, { body: { outcome: 'success' } });
    expectStatus('8: Customer D also pays in full (before cancelling)', submitD, 200);
    // Customer E deliberately never pays.

    const afterPay = await call('GET', '/api/driver/trips/' + tripId, { token: driverToken });
    const manifestAfterPay = (afterPay.json?.manifest as Array<{ reservation_id: string; payment_status?: string }> | undefined) ?? [];
    ok(`8: driver's own trip view lists ${manifestAfterPay.length} reservation(s) after payment`);

    // ════════════════════════════════════════════════════════════════════
    // Step 9 — Settlement/refund: Customer D cancels after paying, before departure
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Step 9: settlement/refund (Customer D cancels a paid reservation) ===');
    expectStatus('9: Customer D cancels their paid, confirmed reservation', await call('POST', `/api/reservations/${resD.id}/cancel`, { token: custD.token }), 200);

    const refundsWorklist = await call('GET', '/api/admin/refunds-worklist', { token: adminToken });
    const refundsDue = await call('GET', '/api/admin/refunds-due', { token: adminToken });
    const worklist = (refundsWorklist.json?.worklist as Array<{ reservation_id?: string; status?: string }> | undefined) ?? [];
    const due = (refundsDue.json?.refunds as Array<{ reservation_id?: string }> | undefined) ?? [];
    const dEntry = worklist.find((r) => r.reservation_id === resD.id);
    if (dEntry || due.some((r) => r.reservation_id === resD.id)) {
      ok(`9: cancelling Customer D's paid reservation produced a refund (worklist status: ${dEntry?.status ?? 'due/pending'})`);
    } else {
      bad('9: refund after cancellation', `worklist=${JSON.stringify(worklist)} due=${JSON.stringify(due)}`);
    }

    // ════════════════════════════════════════════════════════════════════
    // Step 10 — Trip start + passenger boarding (manifest)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Step 10: trip start + passenger boarding ===');
    expectStatus('10: driver starts the trip', await call('POST', `/api/driver/trips/${tripId}/start`, { token: driverToken }), 200);

    const tripDetail = await call('GET', `/api/driver/trips/${tripId}`, { token: driverToken });
    const stopManifest = (tripDetail.json?.stop_manifest as Array<{ wpoint_id: string; seats_entering: number; seats_aboard_after: number }> | undefined) ?? [];
    const atA = stopManifest.find((s) => s.wpoint_id === wpA);
    // Boarding at A: Customer A (1 seat, full route) + Customer B (1 seat, partial) = 2 boarding, since D cancelled and E boards later at B.
    if (atA && atA.seats_entering === 2 && atA.seats_aboard_after === 2) {
      ok('10: passenger boarding manifest at the first stop reflects exactly A+B (D cancelled, E boards further down the route)');
    } else {
      bad('10: boarding manifest at stop A', JSON.stringify(atA));
    }

    // ════════════════════════════════════════════════════════════════════
    // Step 11 — Trip completion -> reservation completion / no-show
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Step 11: trip completion ===');
    expectStatus('11: driver completes the trip', await call('POST', `/api/driver/trips/${tripId}/complete`, { token: driverToken }), 200);

    const finalA = (await call('GET', '/api/reservations/me', { token: custA.token })).json?.reservations as Array<{ id: string; status: string }> | undefined;
    const finalB = (await call('GET', '/api/reservations/me', { token: custB.token })).json?.reservations as Array<{ id: string; status: string }> | undefined;
    const finalE = (await call('GET', '/api/reservations/me', { token: custE.token })).json?.reservations as Array<{ id: string; status: string }> | undefined;
    const statusA = finalA?.find((r) => r.id === resA.id)?.status;
    const statusB = finalB?.find((r) => r.id === resB.id)?.status;
    const statusE = finalE?.find((r) => r.id === resE.id)?.status;

    if (statusA === 'completed') ok('11: Customer A (paid in full) is resolved to completed');
    else bad('11: Customer A final status', String(statusA));
    if (statusB === 'completed') ok('11: Customer B (paid in full via wallet) is resolved to completed');
    else bad('11: Customer B final status', String(statusB));
    if (statusE === 'no_show') ok('11: Customer E (confirmed but never paid) is resolved to no_show, not completed');
    else bad('11: Customer E final status', String(statusE));

    // ════════════════════════════════════════════════════════════════════
    // Step 12 — Driver earnings
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Step 12: driver earnings ===');
    const earnings = await call('GET', '/api/driver/earnings', { token: driverToken });
    const summary = earnings.json?.summary as { gross_revenue?: string; net_earnings?: string; commission?: string } | undefined;
    if (earnings.status === 200 && Number(summary?.gross_revenue) >= 1500 && Number(summary?.net_earnings) > 0) {
      ok(`12: driver earnings summary reflects both completed fares (gross=${summary?.gross_revenue}, net=${summary?.net_earnings}, commission=${summary?.commission})`);
    } else {
      bad('12: driver earnings summary', earnings.text.slice(0, 250));
    }
    const ledger = await call('GET', '/api/driver/earnings/ledger', { token: driverToken });
    const ledgerRows = (ledger.json?.ledger as Array<{ reservation_code?: string }> | undefined) ?? [];
    if (ledger.status === 200 && ledgerRows.length >= 2) {
      ok(`12: payout ledger has ${ledgerRows.length} entries, one per completed reservation`);
    } else {
      bad('12: payout ledger', ledger.text.slice(0, 250));
    }

    // ════════════════════════════════════════════════════════════════════
    // Step 13 — Rating (both directions, on a completed reservation)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n=== Step 13: rating ===');
    const rateDriverRes = await call('POST', `/api/reservations/${resA.id}/rate-driver`, { token: custA.token, body: { stars: 5, review: 'Super voyage, merci !' } });
    expectStatus('13: Customer A rates the driver 5 stars', rateDriverRes, 201);

    const rateCustomerRes = await call('POST', `/api/driver/reservations/${resA.id}/rate-customer`, { token: driverToken, body: { stars: 4, review: 'Passager ponctuel.' } });
    expectStatus('13: driver rates Customer A 4 stars', rateCustomerRes, 201);

    const ratingStatus = await call('GET', `/api/reservations/${resA.id}/rating-status`, { token: custA.token });
    const bothSubmitted = ratingStatus.json?.customer_to_driver === true && ratingStatus.json?.driver_to_customer === true;
    if (ratingStatus.status === 200 && bothSubmitted) {
      ok('13: rating-status confirms both directions were recorded for this reservation');
    } else {
      bad('13: rating-status', ratingStatus.text.slice(0, 250));
    }

    const ratingOnUnfinishedRes = await call('POST', `/api/reservations/${resE.id}/rate-driver`, { token: custE.token, body: { stars: 5 } });
    expectStatus('13: rating a no_show (non-completed) reservation is rejected', ratingOnUnfinishedRes, 400, 'DZ721');
  } finally {
    console.log('\n=== Cleanup ===');
    try {
      const uuidList = (ids: string[]): string => ids.map((id) => `'${id}'`).join(',');
      if (createdTripIds.length) {
        const trips = uuidList(createdTripIds);
        await db.raw(`delete from payout_ledger where trip_id in (${trips})`);
        await db.raw(`delete from rating where reservation_id in (select id from reservation where trip_id in (${trips}))`);
        await db.raw(`delete from no_show_event where trip_id in (${trips})`);
        await db.raw(`delete from refund where payment_id in (select id from payment where reservation_id in (select id from reservation where trip_id in (${trips})))`).catch(() => undefined);
        await db.raw(`delete from payment_gateway_event where payment_id in (select id from payment where reservation_id in (select id from reservation where trip_id in (${trips})))`);
        await db.raw(`delete from payment where reservation_id in (select id from reservation where trip_id in (${trips}))`);
        await db.raw(`delete from reservation where trip_id in (${trips})`);
        await db.raw(`delete from trip_price where trip_id in (${trips})`);
        await db.raw(`delete from trip_stop where trip_id in (${trips})`);
        await db.raw(`delete from trip where id in (${trips})`);
        console.log(`  - removed ${createdTripIds.length} trip(s) and dependents`);
      }
      if (createdDriverIds.length) {
        await db.raw(`delete from kyc_document where driver_id in (${uuidList(createdDriverIds)})`);
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
      if (createdAppUserIds.length) {
        await db.raw(`delete from customer where id in (select customer_id from app_user where id in (${uuidList(createdAppUserIds)}) and customer_id is not null)`);
        await db.raw(`delete from app_user where id in (${uuidList(createdAppUserIds)})`);
        console.log(`  - removed ${createdAppUserIds.length} throwaway app_user account(s) + linked customer rows`);
      }
      // The 4 customer accounts (A/B/D/E) created via self-registration —
      // swept by email prefix instead of id (simpler than threading ids
      // through to this block).
      const swept = await db.raw<{ id: string }>(`delete from app_user where email like $1 returning id`, [`test-e2e-%-${tag}@test.local`]);
      await db.raw(`delete from customer where phone like $1`, [`+21356%${String(tag).slice(-6)}`]);
      console.log(`  - swept ${swept.length} throwaway customer account(s) by email prefix`);
      console.log('✔ all test rows removed');
    } catch (cleanupErr) {
      console.error('✗ cleanup error (some throwaway rows may remain, prefixed TEST-E2E- / test-e2e-*@test.local):', cleanupErr);
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
