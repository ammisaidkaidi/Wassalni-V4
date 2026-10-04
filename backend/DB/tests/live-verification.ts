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
import { GATEWAY_NAME, generateEventId, generateTransactionId } from '../../api/payments/mockGateway';

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
  const createdDriverIds: string[] = [];
  const createdVehicleIds: string[] = [];
  let originalNoShowThreshold: number | null = null;
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

    // ── helper: a throwaway driver, fully cleaned up at the end (never the
    // shared demo driverId — ETA/no-show/KYC tests mutate driver-scoped
    // state we don't want to leave behind on a real account) ────────────────
    const mkTestDriver = async (n: number): Promise<string> => {
      const row = await db.insert<{ id: string }>('driver', {
        full_name: `TEST Driver ${tag}-${n}`,
        nin: `${tag}${n}`.padStart(18, '0').slice(-18),
        phone: `+2136${String(tag).slice(-6)}${n}`,
      });
      createdDriverIds.push(row.id);
      return row.id;
    };

    // ── Task 4.3: live ETA ───────────────────────────────────────────────────
    console.log('\n=== Task 4.3: live ETA ===');
    const etaDriver = await mkTestDriver(1);
    const tripEta = await repo.createTrip({
      trajectoryId: trajectoryId!,
      departureAt: new Date(Date.now() + 3600 * 1000),
      capacity: 5,
      seatPrice: 500,
      driverId: etaDriver,
    });
    createdTripIds.push(tripEta);
    await repo.populateTripStops(tripEta);
    await repo.publishTrip(tripEta);

    const beforeStart = await repo.estimateTripEtas(tripEta);
    if (beforeStart.stops.every((s) => s.eta === null && s.reason === 'not_in_progress') && beforeStart.position_age_seconds === null) {
      ok('4.3: scheduled trip reports reason=not_in_progress for every stop, no fabricated ETA');
    } else {
      bad('4.3: scheduled trip ETA', JSON.stringify(beforeStart));
    }

    await repo.startTrip(tripEta);
    const noLocation = await repo.estimateTripEtas(tripEta);
    if (noLocation.stops.every((s) => s.eta === null && s.reason === 'no_location')) {
      ok('4.3: in_progress trip with no GPS ping ever reported -> reason=no_location, no fabricated ETA');
    } else {
      bad('4.3: no-location ETA', JSON.stringify(noLocation));
    }

    await repo.setDriverLocation(etaDriver, 36.75, 3.06); // Algiers
    const withLocation = await repo.estimateTripEtas(tripEta);
    if (withLocation.stops.length > 0 && withLocation.stops.every((s) => s.eta !== null && s.distance_km !== null && s.reason === null)) {
      ok('4.3: fresh GPS ping -> every stop gets a non-null ETA + distance');
    } else {
      bad('4.3: fresh-location ETA', JSON.stringify(withLocation));
    }
    if (withLocation.position_age_seconds !== null && withLocation.position_age_seconds < 60) {
      ok('4.3: position_age_seconds reflects the just-recorded ping (< 60s old)');
    } else {
      bad('4.3: position_age_seconds', String(withLocation.position_age_seconds));
    }

    await db.raw(`update driver_last_location set recorded_at = now() - interval '40 minutes' where driver_id = $1`, [etaDriver]);
    const stale = await repo.estimateTripEtas(tripEta);
    if (stale.stops.every((s) => s.eta === null && s.reason === 'stale_location')) {
      ok('4.3: a 40-minute-old GPS ping is treated as stale -> no fabricated ETA');
    } else {
      bad('4.3: stale-location ETA', JSON.stringify(stale));
    }

    // ── Task 5.1: capacity re-validated on confirm (not just on insert) ──────
    console.log('\n=== Task 5.1: capacity revalidation during approval ===');
    const tripApprove = await mkTrip(2);
    const resR1 = await expectOk('5.1 setup: reservation R1 (1 seat, pending)', () =>
      repo.reserve({ tripId: tripApprove, customerId: custA, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpC }),
    );
    const resR2 = await expectOk('5.1 setup: reservation R2 (1 seat, pending) — trip now full (2/2)', () =>
      repo.reserve({ tripId: tripApprove, customerId: custB, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpC }),
    );
    if (resR1) {
      await expectOk('5.1: approving R1 still succeeds (nothing changed, capacity still holds)', () => repo.confirmReservation(resR1));
    }
    if (resR1 && resR2) {
      // Directly bump R1's seat count while both are still held — the SAME
      // trigger that guards INSERT also fires on UPDATE OF seats/status/
      // trip_id (trg_reservation_capacity_guard is "after insert or update
      // of seats, status, trip_id"), which is exactly the mechanism that
      // re-validates capacity at confirm time (status pending->confirmed is
      // one such update). This proves that mechanism is live, not just a
      // coincidence of nothing having changed above.
      await expectErr(
        '5.1: bumping R1 to 2 seats would exceed capacity (2/2 already held by R1+R2) -> rejected live by the same guard that runs on confirm',
        () => db.raw(`update reservation set seats = 2 where id = $1`, [resR1]),
        'DZ303',
      );
    }

    // ── Task 5.2: per-stop boarding/alighting manifest ───────────────────────
    console.log('\n=== Task 5.2: per-stop boarding/alighting manifest ===');
    const tripManifest = await mkTrip(5);
    await expectOk('5.2 setup: custA boards at A, alights at B (2 seats)', () =>
      repo.reserve({ tripId: tripManifest, customerId: custA, seats: 2, pickupWpointId: wpA, dropoffWpointId: wpB }),
    );
    await expectOk('5.2 setup: custB boards at B, alights at C (1 seat)', () =>
      repo.reserve({ tripId: tripManifest, customerId: custB, seats: 1, pickupWpointId: wpB, dropoffWpointId: wpC }),
    );
    await expectOk('5.2 setup: custC boards at A, alights at C (1 seat)', () =>
      repo.reserve({ tripId: tripManifest, customerId: custC, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpC }),
    );
    const stopManifest = await repo.getTripStopManifest(tripManifest);
    const atA = stopManifest.find((s) => s.wpoint_id === wpA);
    const atB = stopManifest.find((s) => s.wpoint_id === wpB);
    const atC = stopManifest.find((s) => s.wpoint_id === wpC);
    if (atA && atA.seats_entering === 3 && atA.seats_leaving === 0 && atA.seats_aboard_after === 3 && atA.remaining_capacity === 2) {
      ok('5.2: stop A — 3 seats board (custA:2 + custC:1), 0 alight, 3 aboard, 2 remaining');
    } else {
      bad('5.2: stop A manifest', JSON.stringify(atA));
    }
    if (atB && atB.seats_entering === 1 && atB.seats_leaving === 2 && atB.seats_aboard_after === 2 && atB.remaining_capacity === 3) {
      ok('5.2: stop B — custB boards (1), custA alights (2), 2 aboard after, 3 remaining');
    } else {
      bad('5.2: stop B manifest', JSON.stringify(atB));
    }
    if (atC && atC.seats_entering === 0 && atC.seats_leaving === 2 && atC.seats_aboard_after === 0 && atC.remaining_capacity === 5) {
      ok('5.2: stop C — custB + custC alight (2), 0 aboard after, full capacity free again');
    } else {
      bad('5.2: stop C manifest', JSON.stringify(atC));
    }

    // ── Task 5.3: no-show strikes (flag-only — no automatic blocking) ────────
    console.log('\n=== Task 5.3: no-show strikes ===');
    originalNoShowThreshold = await repo.getNoShowThreshold();
    await repo.setNoShowThreshold(3);

    const custNoShowCountBefore = (await db.raw<{ no_show_count: number }>('select no_show_count from customer where id = $1', [custE]))[0]
      .no_show_count;
    const tripNoShow = await mkTrip(2);
    const resNoShow = await expectOk('5.3 setup: confirmed reservation, never paid', async () => {
      const id = await repo.reserve({ tripId: tripNoShow, customerId: custE, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpB });
      await repo.confirmReservation(id);
      return id;
    });
    if (resNoShow) {
      await repo.startTrip(tripNoShow);
      await repo.closeTrip(tripNoShow);
      const closed = await db.raw<{ status: string }>('select status from reservation where id = $1', [resNoShow]);
      const events = await repo.listNoShowEvents({ customerId: custE });
      const custAfter = (await db.raw<{ no_show_count: number }>('select no_show_count from customer where id = $1', [custE]))[0];
      if (closed[0]?.status === 'no_show') {
        ok('5.3: unpaid confirmed reservation auto-resolves to no_show when the trip closes');
      } else {
        bad('5.3: close_trip resolution', JSON.stringify(closed[0]));
      }
      if (events.some((e) => e.reservation_id === resNoShow && e.kind === 'customer')) {
        ok('5.3: sp_close_trip recorded a customer no_show_event for the ledger');
      } else {
        bad('5.3: no_show_event not recorded for customer', JSON.stringify(events));
      }
      if (custAfter.no_show_count === custNoShowCountBefore + 1) {
        ok('5.3: customer.no_show_count incremented by exactly 1 (trigger-maintained cache)');
      } else {
        bad('5.3: no_show_count increment', `before=${custNoShowCountBefore} after=${custAfter.no_show_count}`);
      }
    }

    const dnsDriver = await mkTestDriver(2);
    const tripDriverNoShow = await repo.createTrip({
      trajectoryId: trajectoryId!,
      departureAt: new Date(Date.now() + 3600 * 1000),
      capacity: 3,
      seatPrice: 500,
      driverId: dnsDriver,
    });
    createdTripIds.push(tripDriverNoShow);
    await repo.populateTripStops(tripDriverNoShow);
    await repo.publishTrip(tripDriverNoShow);
    for (const [from, to] of [[wpA, wpB], [wpB, wpC], [wpA, wpC]] as const) {
      await repo.setTripPrice({ tripId: tripDriverNoShow, fromWpointId: from, toWpointId: to, price: 500 });
    }
    const resDriverNoShow = await expectOk('5.3 setup: a pending reservation on the about-to-no-show trip', () =>
      repo.reserve({ tripId: tripDriverNoShow, customerId: custE, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpB }),
    );
    await expectOk('5.3: recording a driver no-show on a scheduled trip succeeds', () => repo.recordDriverNoShow(tripDriverNoShow, 'test note'));
    const dnsTrip = await db.raw<{ status: string }>('select status from trip where id = $1', [tripDriverNoShow]);
    const dnsEvents = await repo.listNoShowEvents({ driverId: dnsDriver });
    if (dnsTrip[0]?.status === 'cancelled') {
      ok('5.3: driver no-show cancels the trip (it cannot proceed without a driver)');
    } else {
      bad('5.3: driver no-show trip status', JSON.stringify(dnsTrip[0]));
    }
    if (dnsEvents.length === 1 && dnsEvents[0].kind === 'driver' && dnsEvents[0].notes === 'test note') {
      ok('5.3: driver no_show_event recorded with the given note');
    } else {
      bad('5.3: driver no_show_event', JSON.stringify(dnsEvents));
    }
    if (resDriverNoShow) {
      const cascaded = await db.raw<{ status: string }>('select status from reservation where id = $1', [resDriverNoShow]);
      if (cascaded[0]?.status === 'cancelled') {
        ok('5.3: the pending reservation on the no-show trip is cancelled along with it');
      } else {
        bad('5.3: reservation cascade on driver no-show', JSON.stringify(cascaded[0]));
      }
    }
    await expectErr(
      '5.3: recording a driver no-show again on the now-cancelled trip is rejected',
      () => repo.recordDriverNoShow(tripDriverNoShow),
      'DZ309',
    );

    // ── Task 6.1: driver KYC documents ────────────────────────────────────────
    console.log('\n=== Task 6.1: driver KYC ===');
    const kycDriver = await mkTestDriver(3);
    const adminRow = await db.raw<{ id: string }>(`select id from app_user where role = 'admin' limit 1`);
    const reviewerRow = await db.raw<{ id: string }>(`select gen_random_uuid() as id`);
    const adminId = adminRow[0]?.id ?? reviewerRow[0].id;

    const kycDocId1 = await repo.submitKycDocument(kycDriver, 'identity', {
      path: '/tmp/test-identity.jpg',
      fileName: 'identity.jpg',
      mimeType: 'image/jpeg',
    });
    const pendingDoc = await repo.getKycDocument(kycDocId1);
    if (pendingDoc?.status === 'pending') {
      ok('6.1: a freshly-submitted KYC document starts out pending');
    } else {
      bad('6.1: submit KYC document', JSON.stringify(pendingDoc));
    }

    await expectOk('6.1: admin approves a pending KYC document', () => repo.approveKycDocument(kycDocId1, adminId));
    const approvedDoc = await repo.getKycDocument(kycDocId1);
    if (approvedDoc?.status === 'approved' && approvedDoc.reviewed_by === adminId) {
      ok('6.1: approved document records status + reviewer');
    } else {
      bad('6.1: approved document state', JSON.stringify(approvedDoc));
    }
    await expectErr('6.1: approving an already-reviewed document is rejected', () => repo.approveKycDocument(kycDocId1, adminId), 'DZ702');

    const kycDocId2 = await repo.submitKycDocument(kycDriver, 'license', {
      path: '/tmp/test-license.jpg',
      fileName: 'license.jpg',
      mimeType: 'image/jpeg',
    });
    await expectOk('6.1: admin rejects a pending KYC document with a reason', () =>
      repo.rejectKycDocument(kycDocId2, adminId, 'Document illisible'),
    );
    const rejectedDoc = await repo.getKycDocument(kycDocId2);
    if (rejectedDoc?.status === 'rejected' && rejectedDoc.rejection_reason === 'Document illisible') {
      ok('6.1: rejected document records status + rejection_reason');
    } else {
      bad('6.1: rejected document state', JSON.stringify(rejectedDoc));
    }

    const kycDocId3 = await repo.submitKycDocument(kycDriver, 'insurance', {
      path: '/tmp/test-insurance.jpg',
      fileName: 'insurance.jpg',
      mimeType: 'image/jpeg',
    });
    await expectErr('6.1: rejecting without a reason is rejected', () => repo.rejectKycDocument(kycDocId3, adminId, ''), 'DZ703');
    await expectErr('6.1: reviewing an unknown document id is rejected', () => repo.approveKycDocument(reviewerRow[0].id, adminId), 'DZ701');

    const driverDocs = await repo.listKycDocumentsForDriver(kycDriver);
    if (driverDocs.length === 3) {
      ok('6.1: listKycDocumentsForDriver returns the full submission history (3 documents)');
    } else {
      bad('6.1: listKycDocumentsForDriver count', String(driverDocs.length));
    }

    // ── Task 6.2: vehicle inspection + publish eligibility ──────────────────
    console.log('\n=== Task 6.2: vehicle inspection ===');
    const fmtDateOnly = (d: Date): string => d.toISOString().slice(0, 10);
    const todayStr = fmtDateOnly(new Date());
    const pastStr = fmtDateOnly(new Date(Date.now() - 400 * 24 * 3600 * 1000));
    const futureStr = fmtDateOnly(new Date(Date.now() + 400 * 24 * 3600 * 1000));
    const expiredStr = fmtDateOnly(new Date(Date.now() - 24 * 3600 * 1000));

    const inspVehicle = await db.insert<{ id: string }>('vehicle', { matricule: `TEST-INSP-${tag}`, seats: 4 });
    createdVehicleIds.push(inspVehicle.id);
    const inspDriver = await mkTestDriver(4);

    if ((await repo.isVehicleEligible(inspVehicle.id)) === false) {
      ok('6.2: a vehicle with no inspection on file is not eligible');
    } else {
      bad('6.2: eligibility with no inspection', 'expected false');
    }

    const tripNoInsp = await repo.createTrip({
      trajectoryId: trajectoryId!,
      departureAt: new Date(Date.now() + 24 * 3600 * 1000),
      capacity: 4,
      seatPrice: 500,
      driverId: inspDriver,
      vehicleId: inspVehicle.id,
    });
    createdTripIds.push(tripNoInsp);
    await repo.populateTripStops(tripNoInsp);
    await expectErr('6.2: publishing a trip whose vehicle is not eligible is rejected', () => repo.publishTrip(tripNoInsp), 'DZ714');

    const inspRejected = await repo.submitVehicleInspection(inspVehicle.id, inspDriver, {
      inspectionDate: todayStr,
      expiryDate: futureStr,
      maintenanceStatus: 'ok',
    });
    await expectErr(
      '6.2: rejecting an inspection without a reason is rejected',
      () => repo.rejectVehicleInspection(inspRejected, adminId, ''),
      'DZ713',
    );
    await repo.rejectVehicleInspection(inspRejected, adminId, 'Document illisible');
    const rejectedInspRow = await repo.getVehicleInspection(inspRejected);
    if (rejectedInspRow?.approval_state === 'rejected' && rejectedInspRow.rejection_reason === 'Document illisible') {
      ok('6.2: rejected inspection records approval_state + rejection_reason');
    } else {
      bad('6.2: rejected inspection state', JSON.stringify(rejectedInspRow));
    }
    await expectErr(
      '6.2: reviewing an already-reviewed inspection is rejected',
      () => repo.approveVehicleInspection(inspRejected, adminId),
      'DZ712',
    );
    await expectErr(
      '6.2: reviewing an unknown inspection id is rejected',
      () => repo.approveVehicleInspection(reviewerRow[0].id, adminId),
      'DZ711',
    );
    if ((await repo.isVehicleEligible(inspVehicle.id)) === false) {
      ok('6.2: a rejected-only inspection history still leaves the vehicle ineligible');
    } else {
      bad('6.2: eligibility after rejection only', 'expected false');
    }

    // vehicle_is_eligible() looks at the approved record with the single
    // *latest* inspection_date — so each case below must be dated strictly
    // later than the previous one, or an earlier still-valid record would
    // keep "winning" the ordering and the assertion would test nothing.
    const inspExpired = await repo.submitVehicleInspection(inspVehicle.id, inspDriver, {
      inspectionDate: pastStr,
      expiryDate: expiredStr,
      maintenanceStatus: 'ok',
    });
    await repo.approveVehicleInspection(inspExpired, adminId);
    if ((await repo.isVehicleEligible(inspVehicle.id)) === false) {
      ok('6.2: an approved inspection whose expiry_date has already passed leaves the vehicle ineligible');
    } else {
      bad('6.2: eligibility with only an expired approved inspection', 'expected false');
    }

    const inspApproved = await repo.submitVehicleInspection(inspVehicle.id, inspDriver, {
      inspectionDate: todayStr,
      expiryDate: futureStr,
      maintenanceStatus: 'ok',
    });
    await repo.approveVehicleInspection(inspApproved, adminId);
    if ((await repo.isVehicleEligible(inspVehicle.id)) === true) {
      ok('6.2: a newer approved, unexpired, OK inspection makes the vehicle eligible again');
    } else {
      bad('6.2: eligibility after approval', 'expected true');
    }
    await expectOk('6.2: publishing a trip with a now-eligible vehicle succeeds', () => repo.publishTrip(tripNoInsp));

    const inspOutOfService = await repo.submitVehicleInspection(inspVehicle.id, inspDriver, {
      inspectionDate: fmtDateOnly(new Date(Date.now() + 24 * 3600 * 1000)),
      expiryDate: fmtDateOnly(new Date(Date.now() + 365 * 24 * 3600 * 1000)),
      maintenanceStatus: 'out_of_service',
    });
    await repo.approveVehicleInspection(inspOutOfService, adminId);
    if ((await repo.isVehicleEligible(inspVehicle.id)) === false) {
      ok("6.2: an even-newer approved but 'out_of_service' inspection makes the vehicle ineligible again");
    } else {
      bad('6.2: eligibility with out_of_service latest-approved inspection', 'expected false');
    }

    const listedForVehicle = await repo.listVehicleInspectionsForVehicle(inspVehicle.id);
    if (listedForVehicle.length === 4) {
      ok('6.2: listVehicleInspectionsForVehicle returns the full history (4 records)');
    } else {
      bad('6.2: listVehicleInspectionsForVehicle count', String(listedForVehicle.length));
    }
    const pendingAdminQueue = await repo.listVehicleInspectionsAdmin('pending');
    if (pendingAdminQueue.every((i) => i.approval_state === 'pending')) {
      ok('6.2: listVehicleInspectionsAdmin(\'pending\') only returns pending records');
    } else {
      bad('6.2: listVehicleInspectionsAdmin filter', 'found a non-pending record');
    }

    // ── Task 6.3: two-way ratings ─────────────────────────────────────────────
    console.log('\n=== Task 6.3: ratings ===');
    const ratingDriver = await mkTestDriver(5);
    const ratingCustomer = await mkCustomer(6);
    const otherCustomer = await mkCustomer(7);
    const tripForRating = await repo.createTrip({
      trajectoryId: trajectoryId!,
      departureAt: new Date(Date.now() + 2 * 3600 * 1000),
      capacity: 4,
      seatPrice: 500,
      driverId: ratingDriver,
    });
    createdTripIds.push(tripForRating);
    await repo.populateTripStops(tripForRating);
    await repo.publishTrip(tripForRating);
    await repo.setTripPrice({ tripId: tripForRating, fromWpointId: wpA, toWpointId: wpB, price: 500 });
    const resForRating = await repo.reserve({ tripId: tripForRating, customerId: ratingCustomer, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpB });

    await expectErr(
      '6.3: rating a non-completed reservation is rejected',
      () => repo.submitRating({ reservationId: resForRating, direction: 'customer_to_driver', stars: 5, raterCustomerId: ratingCustomer }),
      'DZ721',
    );

    await repo.confirmReservation(resForRating);
    const fullPrice = await db.raw<{ total_price: string }>('select total_price from reservation where id = $1', [resForRating]);
    const payForRating = await repo.recordPayment({ reservationId: resForRating, amount: fullPrice[0].total_price, method: 'cash' });
    await repo.settlePayment(payForRating);
    await repo.startTrip(tripForRating);
    await repo.closeTrip(tripForRating);
    const resAfterClose = await db.raw<{ status: string }>('select status from reservation where id = $1', [resForRating]);
    if (resAfterClose[0]?.status === 'completed') {
      ok('6.3: setup — fully-paid confirmed reservation becomes completed on trip close');
    } else {
      bad('6.3: setup reservation status after close', JSON.stringify(resAfterClose[0]));
    }

    await expectErr(
      '6.3: submitting an out-of-range star rating is rejected',
      () => repo.submitRating({ reservationId: resForRating, direction: 'customer_to_driver', stars: 7, raterCustomerId: ratingCustomer }),
      'DZ001',
    );
    await expectErr(
      '6.3: customer_to_driver rating from a non-owning customer is rejected',
      () => repo.submitRating({ reservationId: resForRating, direction: 'customer_to_driver', stars: 5, raterCustomerId: otherCustomer }),
      'DZ723',
    );
    const ratingC2D = await expectOk('6.3: customer rates driver (5 stars)', () =>
      repo.submitRating({ reservationId: resForRating, direction: 'customer_to_driver', stars: 5, review: 'Excellent', raterCustomerId: ratingCustomer }),
    );
    await expectErr(
      '6.3: rating the same reservation/direction twice is rejected',
      () => repo.submitRating({ reservationId: resForRating, direction: 'customer_to_driver', stars: 4, raterCustomerId: ratingCustomer }),
      'DZ722',
    );
    await expectErr(
      '6.3: driver_to_customer rating from the wrong driver is rejected',
      () => repo.submitRating({ reservationId: resForRating, direction: 'driver_to_customer', stars: 5, raterDriverId: inspDriver }),
      'DZ723',
    );
    const ratingD2C = await expectOk('6.3: driver rates customer (4 stars)', () =>
      repo.submitRating({ reservationId: resForRating, direction: 'driver_to_customer', stars: 4, raterDriverId: ratingDriver }),
    );

    const ratingStatus = await repo.getReservationRatingStatus(resForRating);
    if (ratingStatus.customer_to_driver && ratingStatus.driver_to_customer) {
      ok('6.3: getReservationRatingStatus reports both directions submitted');
    } else {
      bad('6.3: getReservationRatingStatus', JSON.stringify(ratingStatus));
    }

    const ratedDriverProfile = await repo.getDriverProfile(ratingDriver);
    if (ratedDriverProfile?.rating_count === 1 && Number(ratedDriverProfile.rating_avg) === 5) {
      ok('6.3: driver.rating_avg/rating_count maintained by trigger after a rating');
    } else {
      bad('6.3: driver rating_avg/rating_count', JSON.stringify(ratedDriverProfile));
    }

    if (ratingC2D) {
      await expectErr('6.3: moderating (hiding) a rating without a reason is rejected', () => repo.moderateRating(ratingC2D, adminId, true, ''), 'DZ001');
      await repo.moderateRating(ratingC2D, adminId, true, 'Avis suspect');
      const hiddenRating = await repo.getRating(ratingC2D);
      if (hiddenRating?.hidden_at && hiddenRating.moderation_reason === 'Avis suspect') {
        ok('6.3: hidden rating records hidden_at + moderation_reason');
      } else {
        bad('6.3: hidden rating state', JSON.stringify(hiddenRating));
      }
      const driverAfterHide = await repo.getDriverProfile(ratingDriver);
      if (driverAfterHide?.rating_count === 0) {
        ok('6.3: hiding the only rating recomputes driver.rating_count back to 0');
      } else {
        bad('6.3: driver rating_count after hide', JSON.stringify(driverAfterHide));
      }
      await repo.moderateRating(ratingC2D, adminId, false);
      const driverAfterUnhide = await repo.getDriverProfile(ratingDriver);
      if (driverAfterUnhide?.rating_count === 1) {
        ok('6.3: unhiding the rating restores driver.rating_count to 1');
      } else {
        bad('6.3: driver rating_count after unhide', JSON.stringify(driverAfterUnhide));
      }
    }
    void ratingD2C;

    // ── Task 7.1/7.2: mock payment gateway + webhook ────────────────────────
    console.log('\n=== Task 7.1/7.2: payment gateway ===');
    const gwDriver = await mkTestDriver(8);
    const gwCustomer = await mkCustomer(9);
    const tripForGw = await repo.createTrip({
      trajectoryId: trajectoryId!,
      departureAt: new Date(Date.now() + 3 * 3600 * 1000),
      capacity: 4,
      seatPrice: 500,
      driverId: gwDriver,
    });
    createdTripIds.push(tripForGw);
    await repo.populateTripStops(tripForGw);
    await repo.publishTrip(tripForGw);
    await repo.setTripPrice({ tripId: tripForGw, fromWpointId: wpA, toWpointId: wpB, price: 500 });

    const resA = await repo.reserve({ tripId: tripForGw, customerId: gwCustomer, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpB });
    const resATotal = (await db.raw<{ total_price: string }>('select total_price from reservation where id = $1', [resA]))[0].total_price;
    const txnA = generateTransactionId();
    const paymentA = await repo.createGatewayPaymentIntent({
      reservationId: resA,
      amount: resATotal,
      method: 'cib',
      gateway: GATEWAY_NAME,
      gatewayTransactionId: txnA,
    });

    const foundIntent = await repo.getPaymentByGatewayTransactionId(txnA);
    if (foundIntent?.id === paymentA && foundIntent.status === 'pending') {
      ok('7.1: getPaymentByGatewayTransactionId finds the freshly-created pending intent');
    } else {
      bad('7.1: getPaymentByGatewayTransactionId', JSON.stringify(foundIntent));
    }
    const openIntent = await repo.findOpenGatewayIntent(resA);
    if (openIntent?.gateway_transaction_id === txnA) {
      ok('7.1: findOpenGatewayIntent returns the still-pending checkout session (idempotent re-checkout)');
    } else {
      bad('7.1: findOpenGatewayIntent', JSON.stringify(openIntent));
    }

    const badSigResult = await repo.applyGatewayPaymentEvent({
      paymentId: paymentA,
      gateway: GATEWAY_NAME,
      gatewayEventId: generateEventId(),
      eventType: 'payment.succeeded',
      signatureValid: false,
      rawPayload: { note: 'tampered' },
    });
    if (badSigResult === 'rejected') {
      ok('7.2: an invalid-signature webhook event is rejected without touching payment state');
    } else {
      bad('7.2: bad-signature webhook result', badSigResult);
    }
    const stillPending = await repo.getPaymentByGatewayTransactionId(txnA);
    if (stillPending?.status === 'pending') {
      ok('7.2: payment status is untouched after a rejected (bad-signature) webhook');
    } else {
      bad('7.2: payment status after bad-signature webhook', JSON.stringify(stillPending));
    }

    const unknownPaymentResult = await repo.applyGatewayPaymentEvent({
      paymentId: reviewerRow[0].id,
      gateway: GATEWAY_NAME,
      gatewayEventId: generateEventId(),
      eventType: 'payment.succeeded',
      signatureValid: true,
      rawPayload: {},
    });
    if (unknownPaymentResult === 'rejected') {
      ok('7.2: a webhook event for an unknown payment id is rejected');
    } else {
      bad('7.2: unknown-payment webhook result', unknownPaymentResult);
    }

    const successEventId = generateEventId();
    const successResult = await repo.applyGatewayPaymentEvent({
      paymentId: paymentA,
      gateway: GATEWAY_NAME,
      gatewayEventId: successEventId,
      eventType: 'payment.succeeded',
      signatureValid: true,
      rawPayload: { ok: true },
    });
    if (successResult === 'processed') {
      ok('7.2: a valid payment.succeeded webhook is processed');
    } else {
      bad('7.2: success webhook result', successResult);
    }
    const paidRow = await repo.getPaymentByGatewayTransactionId(txnA);
    if (paidRow?.status === 'paid') {
      ok('7.2: payment.status flips to paid after the succeeded webhook');
    } else {
      bad('7.2: payment status after success webhook', JSON.stringify(paidRow));
    }
    const resAStatus = await db.raw<{ status: string }>('select status from reservation where id = $1', [resA]);
    if (resAStatus[0]?.status === 'confirmed') {
      ok('7.2: a fully-paid online payment auto-confirms the (still-pending) reservation');
    } else {
      bad('7.2: reservation auto-confirm after full online payment', JSON.stringify(resAStatus[0]));
    }
    const noLongerOpen = await repo.findOpenGatewayIntent(resA);
    if (noLongerOpen === null) {
      ok('7.1: findOpenGatewayIntent no longer returns a resolved (paid) intent');
    } else {
      bad('7.1: findOpenGatewayIntent after resolution', JSON.stringify(noLongerOpen));
    }

    const replayResult = await repo.applyGatewayPaymentEvent({
      paymentId: paymentA,
      gateway: GATEWAY_NAME,
      gatewayEventId: successEventId,
      eventType: 'payment.succeeded',
      signatureValid: true,
      rawPayload: { ok: true },
    });
    if (replayResult === 'duplicate') {
      ok('7.2: replaying the exact same webhook event id is reported as duplicate, not re-processed');
    } else {
      bad('7.2: replay webhook result', replayResult);
    }
    const alreadyResolvedResult = await repo.applyGatewayPaymentEvent({
      paymentId: paymentA,
      gateway: GATEWAY_NAME,
      gatewayEventId: generateEventId(),
      eventType: 'payment.succeeded',
      signatureValid: true,
      rawPayload: { ok: true },
    });
    if (alreadyResolvedResult === 'duplicate') {
      ok('7.2: a brand-new event id for an already-resolved payment is still reported as duplicate');
    } else {
      bad('7.2: already-resolved webhook result', alreadyResolvedResult);
    }

    // A second, independent reservation/payment to exercise the 'failed' path
    // without disturbing the already-resolved assertions above.
    const resB = await repo.reserve({ tripId: tripForGw, customerId: gwCustomer, seats: 1, pickupWpointId: wpA, dropoffWpointId: wpB });
    const resBTotal = (await db.raw<{ total_price: string }>('select total_price from reservation where id = $1', [resB]))[0].total_price;
    const txnB = generateTransactionId();
    const paymentB = await repo.createGatewayPaymentIntent({
      reservationId: resB,
      amount: resBTotal,
      method: 'edahabia',
      gateway: GATEWAY_NAME,
      gatewayTransactionId: txnB,
    });
    const failResult = await repo.applyGatewayPaymentEvent({
      paymentId: paymentB,
      gateway: GATEWAY_NAME,
      gatewayEventId: generateEventId(),
      eventType: 'payment.failed',
      signatureValid: true,
      rawPayload: { reason: 'insufficient_funds' },
    });
    if (failResult === 'processed') {
      ok('7.2: a valid payment.failed webhook is processed');
    } else {
      bad('7.2: failure webhook result', failResult);
    }
    const failedRow = await repo.getPaymentByGatewayTransactionId(txnB);
    if (failedRow?.status === 'failed' && failedRow.failure_reason === 'insufficient_funds') {
      ok('7.2: failed payment records status=failed and the gateway-supplied failure_reason');
    } else {
      bad('7.2: failed payment state', JSON.stringify(failedRow));
    }
    const resBStatus = await db.raw<{ status: string }>('select status from reservation where id = $1', [resB]);
    if (resBStatus[0]?.status === 'pending') {
      ok('7.2: a failed online payment does NOT auto-confirm the reservation');
    } else {
      bad('7.2: reservation status after failed online payment', JSON.stringify(resBStatus[0]));
    }

    const eventsForA = await repo.listPaymentGatewayEvents(paymentA);
    // 3 rows: bad-signature (rejected) + the original success (processed) +
    // the brand-new-event-id-but-already-resolved call (duplicate). The
    // literal replay with the SAME event id is correctly NOT a 4th row —
    // the unique (gateway, gateway_event_id) index silently absorbs it.
    if (
      eventsForA.length === 3 &&
      eventsForA.filter((e) => e.processing_result === 'rejected').length === 1 &&
      eventsForA.filter((e) => e.processing_result === 'processed').length === 1 &&
      eventsForA.filter((e) => e.processing_result === 'duplicate').length === 1
    ) {
      ok('7.2: listPaymentGatewayEvents(paymentId) shows the full audit trail (rejected + processed + duplicate), literal replay excluded by the unique index');
    } else {
      bad('7.2: listPaymentGatewayEvents(paymentA)', JSON.stringify(eventsForA));
    }

    const fraudSignals = await repo.listFraudSignals();
    if (Array.isArray(fraudSignals)) {
      ok(`6.4: listFraudSignals() runs and returns an array (${fraudSignals.length} signal(s) currently)`);
    } else {
      bad('6.4: listFraudSignals()', JSON.stringify(fraudSignals));
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
      if (originalNoShowThreshold !== null) {
        await repo.setNoShowThreshold(originalNoShowThreshold);
        console.log(`  - restored no_show_strike_threshold to ${originalNoShowThreshold}`);
      }
      if (createdTripIds.length) {
        const trips = uuidList(createdTripIds);
        // payment_gateway_event.payment_id is ON DELETE SET NULL (not
        // cascade), and rating.reservation_id IS cascade — so the gateway
        // audit rows need an explicit delete here, ratings don't.
        await db.raw(
          `delete from payment_gateway_event where payment_id in (select id from payment where reservation_id in (select id from reservation where trip_id in (${trips})))`,
        );
        await db.raw(`delete from payment where reservation_id in (select id from reservation where trip_id in (${trips}))`);
        await db.raw(`delete from reservation where trip_id in (${trips})`);
        await db.raw(`delete from trip_price where trip_id in (${trips})`);
        await db.raw(`delete from trip_stop where trip_id in (${trips})`);
        await db.raw(`delete from trip where id in (${trips})`);
        console.log(`  - removed ${createdTripIds.length} trip(s) and their stops/prices/reservations/payments/ratings/gateway-events`);
      }
      if (createdVehicleIds.length) {
        // vehicle_inspection cascades on vehicle delete; must run after trip
        // deletion above since trip.vehicle_id has no ON DELETE action.
        await db.raw(`delete from vehicle where id in (${uuidList(createdVehicleIds)})`);
        console.log(`  - removed ${createdVehicleIds.length} throwaway vehicle(s) and their inspection records`);
      }
      if (createdDriverIds.length) {
        // Cascades driver_last_location / no_show_event / kyc_document rows
        // for these throwaway drivers — must run after trip deletion above
        // (trip.driver_id has no ON DELETE action, so a referencing trip
        // would block this otherwise).
        await db.raw(`delete from driver where id in (${uuidList(createdDriverIds)})`);
        console.log(`  - removed ${createdDriverIds.length} throwaway driver(s) and their location/no-show/KYC rows`);
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
      console.error(`  vehicleIds=${JSON.stringify(createdVehicleIds)}`);
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
