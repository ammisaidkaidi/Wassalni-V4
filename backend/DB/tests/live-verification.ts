/**
 * live-verification.ts — Tasks 2.1/2.2/2.3/2.4 verification against the real
 * (live) Supabase database this project is already configured for.
 *
 * Unlike DB/tests/sql-utils.test.ts (offline, no DB needed), this script
 * creates real throwaway rows (trajectory/wpoints/trips/customers/
 * reservations, all named/phoned with a TEST- prefix), exercises them, and
 * deletes everything it created in a `finally` block — it never touches the
 * pre-existing demo data. Safe to re-run any time.
 *
 * Run with: npm run test:live   (from backend/)
 *
 * Covers:
 *  - Task 2.1: every legal reservation transition + a representative set of
 *    illegal ones (pending->confirmed->cancelled, re-confirm after cancel,
 *    double-cancel).
 *  - Task 2.2: every legal trip transition + illegal ones, including a
 *    direct UPDATE bypass of the procedures to confirm trg_trip_status_guard
 *    itself (not just the stored procedures) rejects bad transitions.
 *  - Task 2.3: segment-based capacity — two non-overlapping segment
 *    reservations on a capacity=1 trip must BOTH succeed; a third
 *    overlapping one must fail.
 *  - Task 2.4: concurrency races — capacity=1 double-booking, confirm race,
 *    cancel race, payment race. (No expiration race: Task 7.3 — payment
 *    holds/expiry — doesn't exist yet, so there's nothing to race there.)
 */
import { loadDbConfig } from '../config';
import { SupabaseConnection } from '../connection';
import { DBHelper } from '../DBHelper';
import { DomainRepository, explainDomainError } from '../domain';
import { searchTrips } from '../../api/services/tripSearch';

let pass = 0;
let fail = 0;

function ok(label: string): void {
  pass++;
  console.log(`✓ ${label}`);
}
function bad(label: string, detail: string): void {
  fail++;
  console.error(`✗ ${label} — ${detail}`);
}

function sqlstateOf(err: unknown): string | null {
  const explained = explainDomainError(err);
  return explained?.sqlstate ?? null;
}

async function expectOk<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    const v = await fn();
    ok(label);
    return v;
  } catch (err) {
    bad(label, `expected success, got ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function expectErr(label: string, fn: () => Promise<unknown>, expectedCode?: string): Promise<void> {
  try {
    await fn();
    bad(label, 'expected failure, call succeeded');
  } catch (err) {
    const code = sqlstateOf(err);
    if (expectedCode && code !== expectedCode) {
      bad(label, `expected ${expectedCode}, got ${code ?? (err instanceof Error ? err.message : String(err))}`);
    } else {
      ok(`${label} (${code ?? 'rejected'})`);
    }
  }
}

async function main(): Promise<void> {
  const cfg = loadDbConfig();
  const conn = new SupabaseConnection(cfg);
  await conn.init();
  const db = new DBHelper(conn);
  const repo = new DomainRepository(db);

  const tag = Date.now();
  const cleanup: Array<() => Promise<void>> = [];
  const createdCustomerIds: string[] = [];
  const createdTripIds: string[] = [];
  let trajectoryId: string | null = null;

  try {
    console.log(`\n=== Setup (tag ${tag}) ===`);
    const driverRow = await db.raw<{ id: string }>('select id from driver limit 1');
    if (!driverRow[0]) throw new Error('No driver exists in this database — cannot publish a test trip');
    const driverId = driverRow[0].id;

    trajectoryId = await repo.createTrajectory(`TEST-SM-${tag}`);
    const wpA = await repo.addWpoint(trajectoryId, 'Alger');
    const wpB = await repo.addWpoint(trajectoryId, 'Blida');
    const wpC = await repo.addWpoint(trajectoryId, 'Djelfa');
    ok('setup: trajectory Alger->Blida->Djelfa created');

    const mkCustomer = async (n: number): Promise<string> => {
      const id = await repo.createCustomer(`Test Customer ${tag}-${n}`, `+2135${String(tag).slice(-6)}${n}`);
      createdCustomerIds.push(id);
      return id;
    };
    const [custA, custB, custC, custD, custE] = await Promise.all([mkCustomer(1), mkCustomer(2), mkCustomer(3), mkCustomer(4), mkCustomer(5)]);

    const mkTrip = async (capacity: number): Promise<string> => {
      const id = await repo.createTrip({
        trajectoryId: trajectoryId!,
        departureAt: new Date(Date.now() + 24 * 3600 * 1000),
        capacity,
        seatPrice: 500,
        driverId,
      });
      createdTripIds.push(id);
      await repo.populateTripStops(id);
      await repo.publishTrip(id);
      for (const [from, to] of [
        [wpA, wpB],
        [wpB, wpC],
        [wpA, wpC],
      ]) {
        await repo.setTripPrice({ tripId: id, fromWpointId: from, toWpointId: to, price: 500 });
      }
      return id;
    };

    // ── Task 2.3: segment-based capacity ──────────────────────────────────
    console.log('\n=== Task 2.3: segment-based capacity ===');
    const tripSeg = await mkTrip(1);
    const resAB = await expectOk('2.3: reserve Alger->Blida (1/1 seat) succeeds', () =>
      repo.reserve({ tripId: tripSeg, customerId: custA, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpB }),
    );
    await expectOk('2.3: reserve Blida->Djelfa (1/1 seat) ALSO succeeds — non-overlapping segment', () =>
      repo.reserve({ tripId: tripSeg, customerId: custB, seats: 1, pickupWpointId: wpB, dropoffWpointId: wpC }),
    );
    await expectErr(
      '2.3: reserve Alger->Blida again fails — overlaps the already-held Alger->Blida seat',
      () => repo.reserve({ tripId: tripSeg, customerId: custC, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpB }),
      'DZ303',
    );
    await expectErr(
      '2.3: reserve Alger->Djelfa fails — overlaps BOTH held segments',
      () => repo.reserve({ tripId: tripSeg, customerId: custD, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpC }),
      'DZ303',
    );
    const segAvailAB = await repo.seatsAvailable(tripSeg, wpA, wpB);
    const segAvailBC = await repo.seatsAvailable(tripSeg, wpB, wpC);
    if (segAvailAB === 0 && segAvailBC === 0) ok('2.3: seats_available(trip, from, to) reports 0 for both held segments');
    else bad('2.3: seats_available(trip, from, to)', `expected 0/0, got ${segAvailAB}/${segAvailBC}`);

    // ── Task 2.1: reservation state machine ───────────────────────────────
    console.log('\n=== Task 2.1: reservation state machine ===');
    if (resAB) {
      await expectOk('2.1: pending -> confirmed (legal)', () => repo.confirmReservation(resAB));
      await expectErr('2.1: confirmed -> confirmed again (illegal)', () => repo.confirmReservation(resAB), 'DZ402');
      await expectOk('2.1: confirmed -> cancelled (legal)', () => repo.cancelReservation(resAB));
      await expectErr('2.1: cancelled -> confirmed (illegal)', () => repo.confirmReservation(resAB), 'DZ402');
      await expectErr('2.1: cancelled -> cancelled again (illegal)', () => repo.cancelReservation(resAB), 'DZ402');
    }
    const resForPending = await expectOk('2.1: fresh pending reservation for transition test', () =>
      repo.reserve({ tripId: tripSeg, customerId: custE, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpB }),
    );
    if (resForPending) {
      await expectOk('2.1: pending -> cancelled (legal, no confirm step)', () => repo.cancelReservation(resForPending));
    }

    // ── Task 2.2: trip lifecycle ───────────────────────────────────────────
    console.log('\n=== Task 2.2: trip lifecycle ===');
    const tripA = await mkTrip(5);
    await expectOk('2.2: scheduled -> in_progress (legal)', () => repo.startTrip(tripA));
    await expectErr('2.2: in_progress -> in_progress again (illegal)', () => repo.startTrip(tripA), 'DZ304');
    await expectOk('2.2: in_progress -> completed via sp_close_trip (legal)', () => repo.closeTrip(tripA));
    await expectErr('2.2: completed -> cancelled (illegal)', () => repo.cancelTrip(tripA), 'DZ304');
    await expectErr(
      '2.2: direct UPDATE bypass completed -> in_progress rejected by trg_trip_status_guard itself',
      () => db.update('trip', { status: 'in_progress' }, { id: tripA }),
      'DZ304',
    );

    const tripB = await mkTrip(5);
    await expectOk('2.2: scheduled -> cancelled via sp_cancel_trip (legal)', () => repo.cancelTrip(tripB));
    await expectErr('2.2: cancelled -> in_progress (illegal)', () => repo.startTrip(tripB), 'DZ304');

    // ── Task 2.4: concurrency races ────────────────────────────────────────
    console.log('\n=== Task 2.4: concurrency races ===');
    const tripRace = await mkTrip(1);
    {
      const [r1, r2] = await Promise.allSettled([
        repo.reserve({ tripId: tripRace, customerId: custA, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpC }),
        repo.reserve({ tripId: tripRace, customerId: custB, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpC }),
      ]);
      const fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled');
      const rejected = [r1, r2].filter((r) => r.status === 'rejected');
      if (fulfilled.length === 1 && rejected.length === 1) {
        ok('2.4: capacity=1, 2 simultaneous reservations -> exactly one succeeds');
      } else {
        bad('2.4: capacity=1 race', `${fulfilled.length} fulfilled, ${rejected.length} rejected (expected 1/1)`);
      }
      const winner = fulfilled[0]?.status === 'fulfilled' ? fulfilled[0].value : null;

      if (winner) {
        const [c1, c2] = await Promise.allSettled([repo.confirmReservation(winner), repo.confirmReservation(winner)]);
        const confirmedOk = [c1, c2].filter((r) => r.status === 'fulfilled').length;
        if (confirmedOk === 1) ok('2.4: approval race — exactly one of 2 simultaneous confirms succeeds');
        else bad('2.4: approval race', `${confirmedOk} succeeded (expected 1)`);

        const [x1, x2] = await Promise.allSettled([repo.cancelReservation(winner), repo.cancelReservation(winner)]);
        const cancelledOk = [x1, x2].filter((r) => r.status === 'fulfilled').length;
        if (cancelledOk === 1) ok('2.4: cancellation race — exactly one of 2 simultaneous cancels succeeds');
        else bad('2.4: cancellation race', `${cancelledOk} succeeded (expected 1)`);
      }
    }
    {
      const resForPayment = await expectOk('2.4: fresh reservation for payment race', () =>
        repo.reserve({ tripId: tripRace, customerId: custC, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpC }),
      );
      if (resForPayment) {
        const [p1, p2] = await Promise.allSettled([
          db.callScalar('record_payment', resForPayment, 500, 'cash', null),
          db.callScalar('record_payment', resForPayment, 500, 'cash', null),
        ]);
        const paidOk = [p1, p2].filter((r) => r.status === 'fulfilled').length;
        if (paidOk === 1) ok('2.4: payment race — exactly one of 2 simultaneous full-amount payments succeeds');
        else bad('2.4: payment race', `${paidOk} succeeded (expected 1 — second should hit DZ503, over total)`);
      }
    }
    console.log('\n(No expiration race test: Task 7.3 payment-hold/expiry does not exist yet in this schema.)');

    // ── Task 3.1: commune-level search filter ───────────────────────────────
    console.log('\n=== Task 3.1: commune-level search filter ===');
    const communeIdByName = async (wilayaName: string, communeName: string): Promise<number> => {
      const rows = await db.raw<{ id: number }>(
        `select c.id from commune c join wilaya w on w.id = c.wilaya_id where w.nom_fr = $1 and c.nom_fr = $2`,
        [wilayaName, communeName],
      );
      if (!rows[0]) throw new Error(`Commune not found: ${communeName}, ${wilayaName}`);
      return rows[0].id;
    };
    const blidaCommuneId = await communeIdByName('Blida', 'Blida');
    const beniMeredCommuneId = await communeIdByName('Blida', 'Beni Mered');
    const algerCentreCommuneId = await communeIdByName('Alger', 'Alger Centre');

    // Restrict wpB (Blida wpoint) to only the 'Blida' commune, so the
    // unrestricted-vs-restricted distinction is actually exercised below.
    await repo.selectCommune(wpB, 'Blida');
    const wpBCommuneIds = await repo.wpointCommuneIds(wpB);
    if (wpBCommuneIds.length === 1 && wpBCommuneIds[0] === blidaCommuneId) {
      ok('3.1 setup: wpB (Blida) now restricted to exactly the "Blida" commune');
    } else {
      bad('3.1 setup', `expected [${blidaCommuneId}], got ${JSON.stringify(wpBCommuneIds)}`);
    }

    // ── Task 4.1: GPS / commune validation ──────────────────────────────────
    console.log('\n=== Task 4.1: GPS / commune validation ===');
    const tripCommune = await mkTrip(5);
    const resCommune = await expectOk('4.1: fresh reservation Alger->Blida for commune/GPS validation', () =>
      repo.reserve({ tripId: tripCommune, customerId: custD, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpB }),
    );
    if (resCommune) {
      await expectErr(
        '4.1: dropoff commune "Beni Mered" rejected — not in wpB\'s configured subset ("Blida" only)',
        () => repo.setReservationCommunes(resCommune, { dropoffCommuneId: beniMeredCommuneId }),
        'DZ604',
      );
      await expectOk('4.1: dropoff commune "Blida" accepted — matches wpB\'s configured subset', () =>
        repo.setReservationCommunes(resCommune, { dropoffCommuneId: blidaCommuneId }),
      );
      await expectErr(
        '4.1: dropoff commune "Alger Centre" rejected — wrong wilaya entirely for this stop',
        () => repo.setReservationCommunes(resCommune, { dropoffCommuneId: algerCentreCommuneId }),
        'DZ203',
      );
      await expectErr(
        '4.1: GPS pin in Paris rejected — outside Algeria bounding box',
        () => repo.setReservationGeo(resCommune, { pickupLat: 48.8566, pickupLon: 2.3522 }),
        'DZ605',
      );
      await expectOk('4.1: GPS pin in Algiers accepted — inside Algeria', () =>
        repo.setReservationGeo(resCommune, { pickupLat: 36.75, pickupLon: 3.06 }),
      );
    }

    // ── Task 3.1 (continued): the commune filter actually changes search results ──
    const wilayaIdByName = async (name: string): Promise<number> => {
      const rows = await db.raw<{ id: number }>(`select id from wilaya where nom_fr = $1`, [name]);
      if (!rows[0]) throw new Error(`Wilaya not found: ${name}`);
      return rows[0].id;
    };
    const algerWilayaId = await wilayaIdByName('Alger');
    const blidaWilayaId = await wilayaIdByName('Blida');
    const foundWithBlida = await searchTrips(db, {
      fromWilayaId: algerWilayaId,
      toWilayaId: blidaWilayaId,
      toCommuneId: blidaCommuneId,
      page: 1,
      pageSize: 50,
    });
    const foundWithBeniMered = await searchTrips(db, {
      fromWilayaId: algerWilayaId,
      toWilayaId: blidaWilayaId,
      toCommuneId: beniMeredCommuneId,
      page: 1,
      pageSize: 50,
    });
    if (foundWithBlida.trips.some((t) => t.id === tripCommune)) {
      ok('3.1: search Alger->Blida filtered to commune "Blida" finds the trip (wpB serves it)');
    } else {
      bad('3.1: search filtered to "Blida"', 'trip not found, expected it to match');
    }
    if (!foundWithBeniMered.trips.some((t) => t.id === tripCommune)) {
      ok('3.1: search Alger->Blida filtered to commune "Beni Mered" does NOT find the trip (wpB doesn\'t serve it)');
    } else {
      bad('3.1: search filtered to "Beni Mered"', 'trip was found, expected it to be excluded');
    }
  } finally {
    console.log('\n=== Cleanup ===');
    // NOTE: the management-api transport inlines $n params as scalars/jsonb
    // (see DB/sql-utils.ts sqlLiteral) — it has no native Postgres array
    // literal support, so `= any($1)` with a JS array does not work here.
    // These ids are internally generated UUIDs (never external input), so
    // inlining them into an `in (...)` list directly is safe for this
    // test-only cleanup.
    const uuidList = (ids: string[]): string => ids.map((id) => `'${id}'`).join(',');
    try {
      if (createdTripIds.length) {
        const trips = uuidList(createdTripIds);
        await db.raw(`delete from payment where reservation_id in (select id from reservation where trip_id in (${trips}))`);
        await db.raw(`delete from reservation where trip_id in (${trips})`);
        await db.raw(`delete from trip_price where trip_id in (${trips})`);
        await db.raw(`delete from trip_stop where trip_id in (${trips})`);
        await db.raw(`delete from trip where id in (${trips})`);
        console.log(`  - removed ${createdTripIds.length} trip(s) and their stops/prices/reservations/payments`);
      }
      if (trajectoryId) {
        await db.raw(`delete from default_trip_price where trajectory_id = '${trajectoryId}'`);
        await db.raw(`delete from wpoint_commune where wpoint_id in (select id from wpoint where trajectory_id = '${trajectoryId}')`);
        await db.raw(`delete from wpoint where trajectory_id = '${trajectoryId}'`);
        await db.raw(`delete from trajectory where id = '${trajectoryId}'`);
        console.log('  - removed trajectory + wpoints');
      }
      if (createdCustomerIds.length) {
        await db.raw(`delete from customer where id in (${uuidList(createdCustomerIds)})`);
        console.log(`  - removed ${createdCustomerIds.length} customer(s)`);
      }
      console.log('✔ all test rows removed');
    } catch (err) {
      console.error('⚠ cleanup failed (manual cleanup may be needed):', err instanceof Error ? err.message : err);
      console.error(`  trajectoryId=${trajectoryId}`);
      console.error(`  tripIds=${JSON.stringify(createdTripIds)}`);
      console.error(`  customerIds=${JSON.stringify(createdCustomerIds)}`);
      fail++;
    }
    await conn.close().catch(() => undefined);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('✗ fatal:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
