# Wassalni — State Machines (TASK 2.1 / 2.2)

Both lifecycles below were already enforced server-side before this document
existed (scattered across SQL functions/triggers — see feature-matrix.md's
prior PARTIAL rating). This document is the missing centralized reference;
it does not change behavior, except where noted. All transitions described
here were exercised against the live database by
`backend/DB/tests/live-verification.ts` (`npm run test:live`, from `backend/`)
— **25/25 assertions passed** on the run used to write this doc. The script
creates its own throwaway trajectory/wpoints/trips/customers/reservations and
deletes them all in a `finally` block; `npm run db:status` row counts were
confirmed unchanged before and after.

## 1. Reservation state machine (Task 2.1)

### States
`reservation_status` enum: `pending`, `confirmed`, `completed`, `cancelled`, `no_show`.

| State | Meaning |
|---|---|
| `pending` | Seat(s) held, created by `reserve()`. Counts against capacity (it participates in the segment-overlap check, Task 2.3) but payment/approval not yet settled. |
| `confirmed` | Admin/driver has confirmed the booking. Still counts against capacity. |
| `completed` | Trip closed (`sp_close_trip`) while this reservation was `confirmed` **and** fully paid (`amount_paid(r.id) >= r.total_price`). Terminal. |
| `no_show` | Trip closed while this reservation was `confirmed` but **not** fully paid. Terminal. |
| `cancelled` | Cancelled by a user (`cancel_reservation`) or automatically cascaded (trip cancelled, or still-`pending` at trip close). Terminal. |

### Transition table

| From ↓ \ To → | pending | confirmed | completed | no_show | cancelled |
|---|---|---|---|---|---|
| **pending** | — | ✅ `confirm_reservation()` | ❌ | ❌ | ✅ `cancel_reservation()`; auto-cancelled if still pending when trip closes |
| **confirmed** | ❌ | — (no-op guarded, see below) | ✅ auto, on `sp_close_trip` if fully paid | ✅ auto, on `sp_close_trip` if not fully paid | ✅ `cancel_reservation()`; auto-cancelled if the trip is cancelled |
| **completed** | ❌ | ❌ | — | ❌ | ❌ (terminal) |
| **no_show** | ❌ | ❌ | ❌ | — | ❌ (terminal) |
| **cancelled** | ❌ | ❌ | ❌ | ❌ | — (terminal) |

Any cell marked ❌ raises `DZ402 INVALID_RESERVATION_TRANSITION` (confirmed
live: re-confirming an already-confirmed reservation, confirming/cancelling a
cancelled one, and re-cancelling a cancelled one were all tested and all
raised DZ402 — see "Test evidence" below).

### Who may perform each transition

| Transition | Trigger | Caller |
|---|---|---|
| → `pending` | `reserve()` | Customer (self-service booking) or admin/driver creating a manual reservation |
| `pending` → `confirmed` | `confirm_reservation()` | Admin / driver (`POST /api/admin/reservations/:id/confirm`, `POST /api/driver/reservations/:id/confirm`) |
| `pending`/`confirmed` → `cancelled` | `cancel_reservation()` | Customer (own reservation), admin, or driver |
| `confirmed` → `completed`/`no_show` | `sp_close_trip()` | Admin / driver closing the trip (automatic side-effect, not a direct reservation action) |
| `pending` → `cancelled` (bulk) | `sp_close_trip()` | Automatic: any reservation still `pending` when its trip closes is cancelled, never silently left dangling |
| `pending`/`confirmed` → `cancelled` (bulk) | `trg_trip_cancel_cascade` | Automatic: cancelling a trip cascades to cancel all its active reservations |
| any → failed (payment side-effect) | `trg_reservation_cancel_cascade` | Automatic: cancelling a reservation fails any of its still-`pending` payments (not a reservation-status transition, listed here because it's a direct consequence of one) |

### Transition validation / enforcement

- `confirm_reservation(p_reservation)` and `cancel_reservation(p_reservation)`
  are themselves the enforcement: each does a single
  `update reservation set status = X where id = $1 and status in (<legal
  predecessors>)`. If 0 rows match, the function checks whether the
  reservation exists at all to distinguish `DZ401 RESERVATION_NOT_FOUND` from
  `DZ402 INVALID_RESERVATION_TRANSITION`. This is atomic (single statement,
  implicit row lock) — see Task 2.4 concurrency notes below.
- **Asymmetry vs. the trip state machine (noted, not a defect to fix in this
  batch):** trips have a blanket trigger (`trg_trip_status_guard`, fires on
  every `UPDATE` to `trip.status`, see §2) that rejects illegal transitions
  no matter which code path attempts them. Reservations have **no equivalent
  trigger** — `reservation.status` is only ever written by
  `confirm_reservation`/`cancel_reservation`/`sp_close_trip`/the two cascade
  triggers above, and protection depends on all of those staying
  disciplined about their own `where status = ...` guards. A raw
  `update reservation set status = 'confirmed' where id = ...` issued from
  anywhere else in the codebase would **not** be blocked at the database
  level. Today nothing in the codebase does this (verified: `grep -rn
  "update('reservation'" backend/` finds exactly one raw
  `db.update('reservation', ...)` call, `setReservationGeo()`, and it only
  ever touches the `pickup_lat/pickup_lon/dropoff_lat/dropoff_lon` geo-pin
  columns, never `status`), so it's not an active bug, but it means the
  reservation lifecycle's safety net is weaker than the trip lifecycle's by
  construction. Flagging as a candidate follow-up
  (`trg_reservation_status_guard` mirroring `trg_trip_status_guard`) rather
  than implementing it speculatively in this batch.
- Capacity (Task 2.3) is enforced separately at `INSERT` time by
  `trg_reservation_capacity_guard`, not part of the status machine itself.

### Test evidence (live, Task 2.1 section of `live-verification.ts`)
- `pending → confirmed`: ✅ succeeded.
- `confirmed → confirmed` (re-confirm): ❌ rejected, `DZ402`.
- `confirmed → cancelled`: ✅ succeeded.
- `cancelled → confirmed`: ❌ rejected, `DZ402`.
- `cancelled → cancelled` (double-cancel): ❌ rejected, `DZ402`.
- `pending → cancelled` (direct, no confirm step): ✅ succeeded.

---

## 2. Trip lifecycle (Task 2.2)

### States
`trip_status` enum: `scheduled`, `in_progress`, `completed`, `cancelled`.

| State | Meaning |
|---|---|
| `scheduled` | Default on `create_trip()`. May or may not be published (`published_at`) yet; publishing requires a `driver_id` to already be set (`sp_publish_trip`). |
| `in_progress` | Trip has been started (`start_trip`). |
| `completed` | Trip has been closed (`sp_close_trip`); finalizes all `confirmed` reservations into `completed`/`no_show` and cancels any still-`pending` ones. Terminal. |
| `cancelled` | Trip cancelled (`sp_cancel_trip`); cascades to cancel all active reservations. Terminal. |

### Transition table

| From ↓ \ To → | scheduled | in_progress | completed | cancelled |
|---|---|---|---|---|
| **scheduled** | — | ✅ `start_trip()` | ❌ | ✅ `sp_cancel_trip()` |
| **in_progress** | ❌ | — | ✅ `sp_close_trip()` | ✅ `sp_cancel_trip()` |
| **completed** | ❌ | ❌ | — | ❌ (terminal) |
| **cancelled** | ❌ | ❌ | ❌ | — (terminal) |

Enforced by `trg_trip_status_guard`, a `BEFORE UPDATE` trigger on `trip`:

```
if new.status = old.status then return new; end if;
if old.status = 'scheduled'   and new.status in ('in_progress','cancelled') then return new; end if;
if old.status = 'in_progress' and new.status in ('completed','cancelled')   then return new; end if;
raise exception 'Invalid trip transition' using errcode = 'DZ304';
```

Unlike the reservation machine, this fires on **every** `UPDATE` to
`trip.status` regardless of which code path issues it — confirmed live by
issuing a raw `db.update('trip', {status:'in_progress'}, {id: completedTripId})`
bypass (not through `sp_*`) against a `completed` trip: it was rejected with
`DZ304`, same as going through the stored procedure. This is the stronger
pattern noted as a candidate improvement for the reservation machine above.

### Who may perform each transition

| Transition | Trigger | Caller |
|---|---|---|
| → `scheduled` | `create_trip()` | Admin |
| (publish, not a status change) | `sp_publish_trip()` | Admin — sets `published_at`; requires `driver_id` already assigned |
| `scheduled` → `in_progress` | `start_trip()` | Driver (own trip) or admin |
| `in_progress` → `completed` | `sp_close_trip()` | Driver (own trip, fixed in Task 1.1 to call this instead of the old `complete_trip()`) or admin |
| `scheduled`/`in_progress` → `cancelled` | `sp_cancel_trip()` | Admin |
| (customer-visible) | — | Customers never call a trip-status endpoint; they only ever read `trip.status`/`v_trip.status` (search results, trip detail, "my reservations") — read-only exposure, not a transition actor. |

### Transition validation / enforcement
- `start_trip()`, `sp_close_trip()`, `sp_cancel_trip()` each additionally
  pre-check the expected current status themselves (defense in depth) and
  raise `DZ304` with a clear message before even attempting the `UPDATE`;
  `trg_trip_status_guard` is the authoritative backstop that holds even if a
  future code path forgets that check or writes to `trip.status` directly.
- Side effects wired into the same transitions: `trg_trip_cancel_cascade`
  (→ `cancelled` cancels active reservations), `sp_close_trip`'s own
  reservation finalization logic (→ `completed`/`no_show`/bulk-cancel
  pending), `trg_trip_edit_lock` (once published, core trip fields become
  immutable while it has active reservations — a separate guard, not a
  status transition, listed here because it interacts with the same table).

### Test evidence (live, Task 2.2 section of `live-verification.ts`)
- `scheduled → in_progress`: ✅ succeeded.
- `in_progress → in_progress` (re-start): ❌ rejected, `DZ304`.
- `in_progress → completed`: ✅ succeeded.
- `completed → cancelled`: ❌ rejected, `DZ304`.
- Raw `UPDATE` bypass of `completed → in_progress`: ❌ rejected, `DZ304` — proves the trigger itself (not just the procedure) is the backstop.
- `scheduled → cancelled` (fresh trip): ✅ succeeded.
- `cancelled → in_progress`: ❌ rejected, `DZ304`.

---

## 3. Segment-based capacity (Task 2.3) — interacts with both machines

Not a third state machine, but documented here because it gates the
`pending`/`confirmed` reservation states above. `reserve()` and
`trg_reservation_capacity_guard` treat each trip as a sequence of elementary
segments between consecutive wpoints (by `position`); a reservation occupies
the half-open range `[pickup_position, dropoff_position)`. Two reservations
only compete for the same seat(s) if their ranges overlap.

`seats_available(p_trip, p_from_wpoint default null, p_to_wpoint default
null)`:
- both args `null` → worst-case bottleneck across every elementary segment
  of the whole route (used by trip-overview displays, `v_trip`).
- both given → remaining capacity for exactly that pickup→dropoff range.

### Test evidence (live, Task 2.3 section of `live-verification.ts`, capacity = 1 trip)
- Reserve Alger→Blida (1/1 seat): ✅ succeeded.
- Reserve Blida→Djelfa (1/1 seat), same trip, same capacity: ✅ **also**
  succeeded — proves non-overlapping segments don't compete.
- Reserve Alger→Blida again: ❌ rejected, `DZ303` — overlaps the first segment.
- Reserve Alger→Djelfa: ❌ rejected, `DZ303` — overlaps both held segments.
- `seats_available(trip, Alger, Blida)` and `seats_available(trip, Blida, Djelfa)` both reported `0` after the two bookings above.

## 4. Concurrency (Task 2.4 — formally closed out this batch)

All via `Promise.allSettled` on two simultaneous calls against the live DB:

- **Double-booking race** (capacity = 1, two customers, same segment): exactly 1 of 2 `reserve()` calls succeeded, the other rejected `DZ303`.
- **Approval race**: exactly 1 of 2 simultaneous `confirm_reservation()` calls on the same reservation succeeded.
- **Cancellation race**: exactly 1 of 2 simultaneous `cancel_reservation()` calls on the same reservation succeeded.
- **Payment race**: exactly 1 of 2 simultaneous `record_payment()` calls for the full `total_price` on the same reservation succeeded (the second correctly hit `DZ503`, over the total).
- **Expiration race**: not tested — there is no payment-hold/expiry concept in the schema yet (Task 7.3 is not implemented), so there is nothing to race.

All of the above work because each is a single SQL statement/function call
that takes a row-level lock (`for update`, directly or via the unique
`where status = ...` update) before checking+writing — the second concurrent
caller blocks until the first's implicit transaction commits, then
re-evaluates its own precondition against the now-committed row and finds it
no longer matches.

## 5. Commune & GPS validation (Task 4.1)

Not a state machine either, but added here for the same reason as §3: it's
server-side reservation validation proven by the same live test run.

`reservation.pickup_commune_id` / `dropoff_commune_id` (nullable, optional)
are validated by `set_reservation_communes(p_reservation, p_pickup_commune,
p_dropoff_commune)`:
1. the commune must belong to the wilaya of that side's wpoint (`DZ203`);
2. if the wpoint has a curated commune subset configured
   (`wpoint_commune` has any row for it — set via the admin/driver WPoint
   editor's commune picker), the chosen commune must be in that exact
   subset (`DZ604`); if the wpoint has no such rows, it's unrestricted and
   any commune of the wilaya is accepted — the same "no restriction
   configured" convention the admin UI already uses
   ("Aucune commune sélectionnée — toute la wilaya reste disponible").

`DomainRepository.setReservationGeo()` additionally rejects pickup/dropoff
GPS coordinates outside a generous Algeria bounding box (`DZ605`) before
writing them — catching obviously-wrong points (wrong field order, `(0,0)`,
a different country) without needing real commune polygon geometry (none
exists in this schema; the commune/daira/wilaya tables are plain
administrative lookup tables, not PostGIS boundaries).

### Test evidence (live, Task 4.1 section of `live-verification.ts`)
- A wpoint restricted (via `selectCommune`) to only the "Blida" commune: a dropoff commune of "Beni Mered" (same wilaya, different commune) was rejected `DZ604`; "Blida" itself was accepted; a commune from a completely different wilaya ("Alger Centre") was rejected `DZ203`.
- A GPS pin in Paris (48.8566, 2.3522) was rejected `DZ605`; a pin in Algiers (36.75, 3.06) was accepted.
- (Task 3.1) Searching Alger→Blida filtered to the "Blida" commune found the trip; filtered to "Beni Mered" (not served by that trip's wpoint) correctly excluded it.

## 6. Live ETA (Task 4.3) — read-only, not a state machine

Not a state machine, but documented here for the same reason as §3/§5: it's
live-tested server-side logic driven by trip/reservation state. ETA is a
**computed, never-stored** value — there is no "ETA" column anywhere.

`estimateTripEtas(tripId)` returns one entry per remaining stop. For each it
returns `eta: null` with a `reason` instead of a number whenever it cannot
honestly compute one:

| Reason | When |
|---|---|
| `not_in_progress` | Trip isn't `in_progress` yet (nothing to estimate against — matches the trip-lifecycle machine in §2). |
| `no_location` | Trip is `in_progress` but the driver (or their vehicle) has never sent a GPS ping. |
| `stale_location` | Latest ping exists but is older than 20 minutes — treated as unreliable rather than extrapolated. |
| (missing centroid) | A wilaya has no entry in `WILAYA_CENTROIDS` — defensive, should not happen for the 58 seeded wilayas. |
| *(none — real ETA)* | Fresh ping + trip in progress: haversine distance from last-known position to the stop's wilaya centroid, at an assumed 55 km/h average, plus `distance_km` and `position_age_seconds` for transparency. |

### Access control
- `GET /api/driver/trips/:id/eta` — driver, own trip only, all remaining stops.
- `GET /api/reservations/:id/eta` — customer, own reservation only, **their
  own dropoff stop only** (never the full manifest or raw coordinates of the
  driver) — a reservation-scoped view, not a trip-scoped one, to avoid
  leaking other passengers' stops or exact driver location to a customer.

### Test evidence (live, Task 4.3 section of `live-verification.ts`)
- `scheduled` trip: every stop reports `not_in_progress`, no fabricated ETA.
- `in_progress` trip, never pinged: `no_location`, no fabricated ETA.
- Fresh ping inserted: every stop gets a non-null ETA + distance; `position_age_seconds` < 60.
- Same ping backdated 40 minutes: `stale_location`, no fabricated ETA.

## 7. No-show strikes (Task 5.3)

Not a state machine on an enum column — an append-only ledger
(`no_show_event`) plus a derived, trigger-maintained counter/flag.

### Customer no-show
Happens only as a side effect of the trip-lifecycle `in_progress → completed`
transition (§2): `sp_close_trip()` classifies any reservation still
`confirmed` with `amount_paid = 0` as `no_show` (unchanged from before this
task) and **now additionally** inserts a `no_show_event(kind='customer', ...)`
row in the same statement — one source of truth for "was this a no-show",
no duplicated logic between the classification and the ledger write.

### Driver no-show
A new, independent action: `record_driver_no_show(trip_id, notes)`. Legal
**only** while the trip is still `scheduled` (the driver never started it —
`DZ309` otherwise, including on an already-`cancelled` trip). Effects, all in
one statement: inserts `no_show_event(kind='driver', ...)`, cancels the trip
(`sp_cancel_trip`-equivalent transition to `cancelled`, reusing §2's cascade
so active reservations are cancelled too — there is no "driver didn't show
up but the trip stays bookable" state).

### Strike counting & flagging
`trg_no_show_event_apply` (`AFTER INSERT` on `no_show_event`) increments the
matching `customer.no_show_count` or `driver.no_show_count`, and sets
`flagged_at = now()` the moment the count reaches the configurable
`app_setting.no_show_strike_threshold` (admin-editable via
`GET`/`PUT /api/admin/settings/no-show-threshold`, default 3). Already-flagged
accounts aren't re-flagged/timestamp-bumped on further strikes.

**Explicit scope decision (user-directed):** flag-only. Reaching the
threshold is purely a visible signal for admins (badge + count in the
Chauffeurs/Clients tables, plus the full ledger in the new "Absences" tab) —
it does **not** automatically block booking (customer) or publishing/starting
trips (driver). Any restriction remains a manual admin action outside this
mechanism.

### Test evidence (live, Task 5.3 section of `live-verification.ts`)
- An unpaid `confirmed` reservation on a trip that gets closed: reservation → `no_show`, a matching `no_show_event` ledger row is recorded, `customer.no_show_count` increments by exactly 1.
- `record_driver_no_show` on a `scheduled` trip: succeeds, cancels the trip, cancels its pending reservation, records the ledger row with the given note.
- A second `record_driver_no_show` call on the now-`cancelled` trip: rejected `DZ309`.

## 8. Driver KYC document review (Task 6.1)

`kyc_document.status` enum: `pending` → `approved` | `rejected` (terminal
either way — a correction/resubmission is a **new row**, not a reopened one,
so the review history is permanent and auditable).

| From ↓ \ To → | pending | approved | rejected |
|---|---|---|---|
| **pending** | — | ✅ `kyc_approve(doc, admin)` | ✅ `kyc_reject(doc, admin, reason)` |
| **approved** | ❌ `DZ702` | ❌ `DZ702` | ❌ `DZ702` |
| **rejected** | ❌ `DZ702` | ❌ `DZ702` | ❌ `DZ702` |

- `kyc_reject` additionally requires a non-blank `reason` (`DZ703`) — a
  rejection is never silent; the reason is shown back to the driver.
- Both functions raise `DZ701` if the document id doesn't exist.
- A driver may have many `kyc_document` rows per `doc_type` over time (every
  submission attempt is kept); "current status for a doc type" = the latest
  row for that `(driver_id, doc_type)` ordered by `submitted_at`.
- Real files (JPEG/PNG/WEBP/PDF, ≤8MB) are stored on disk under
  `backend/uploads/kyc/<driver_id>/` and only ever served through an
  auth-checked streaming route — never a public/static path — so "admin can
  view/download the actual uploaded file" doesn't also mean "the file is
  guessable/public".

### Test evidence (live, Task 6.1 section of `live-verification.ts`)
- Fresh submission starts `pending`.
- Approve: succeeds, records `status='approved'` + `reviewed_by`.
- Approve again on the same (now-approved) document: rejected `DZ702`.
- Reject with a reason on a different, still-`pending` document: succeeds, records `status='rejected'` + the reason.
- Reject with an empty reason: rejected `DZ703`.
- Review (approve) of an unknown document id: rejected `DZ701`.
- `listKycDocumentsForDriver` returns the driver's full 3-document submission history.
