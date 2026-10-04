# Wassalni — Feature Matrix (TASK 0.2)

Produced from the baseline audit (TASK 0.1) of `/home/user/wassalni/agent/tasks.txt`'s
20-phase backlog, against the actual backend (`backend/`), frontend (`frontend/src/`) and
schema (`agent/sql.txt`) as of this commit. Classification: **COMPLETE** / **PARTIAL** /
**BROKEN** / **MISSING**, per the task file's own instruction (audit before implementing).

Evidence for every row was obtained by reading the real route/domain/schema code, not by
assumption. Rows produced earlier in this session (before this file was written) are
flagged "(prior session)" — still grounded in code reads, just not re-verified again today.

## Phase 0 — Baseline audit
| Task | Status | Notes |
|---|---|---|
| 0.1 Full application audit | **COMPLETE** | This pass + prior-session deep audit. See notes column throughout this file for the findings. |
| 0.2 Feature matrix | **COMPLETE** | This document. |

## Phase 1 — Existing bugs & cheap fixes
| Task | Status | Notes |
|---|---|---|
| 1.1 Fix driver trip completion | **COMPLETE** (this batch) | `driver.ts` `/trips/:id/complete` now calls `repo.closeTrip` (`sp_close_trip`) instead of the bare `completeTrip` (`complete_trip()`), matching admin's close-trip route exactly — reservations no longer get stuck at `confirmed` when a driver (not admin) closes their own trip. |
| 1.2 Customer profile | **COMPLETE** (this batch) | New `GET/PUT /api/customer/me` + `ProfilePage.tsx`. NIN/NIF/address/home wilaya+commune/GPS lat+lon all editable; ownership is implicit (`req.user.customer_id`, no id ever accepted from the client); validation mirrors the DB's own regex/FK/paired-GPS constraints. |
| 1.3 Customer payment visibility | **COMPLETE** (this batch) | `reservationSelect` (used by `/api/reservations/me`) now returns `amount_paid`, `balance_due`, `payment_status`, `refunded_amount`, `refund_status` — all computed in SQL (`amount_paid()` function, same expressions as `v_reservation`), not duplicated in the frontend. Surfaced on `MyReservationsPage.tsx`. |
| 1.4 Refund worklist | **COMPLETE** (this batch) | New `GET /api/admin/refunds-worklist` (`repo.refundWorklist()`) returns one row per still-refundable *payment* (not per reservation like the older `v_refund_due`), joined with reservation/trip/customer context. `AdminPage.tsx`'s "Remboursements en attente" table now shows paid/already-refunded/remaining-to-refund columns + a direct "Rembourser" action button per row, a count badge on the section heading, and a count badge on the "Paiements" tab itself so admins notice pending refunds without opening the tab. Explicitly distinguishes refund-due from already-refunded (separate columns, filtered `where ... amount - refunded_amount > 0`). |
| 1.5 Contextual domain errors | **COMPLETE** (this batch) | `errors.ts` now has a `USER_MESSAGES` French translation table keyed by `DZxxx` SQLSTATE, shown to users in place of the technical description (which stays available alongside for support/debugging). New `DomainValidationError` class (`domain.ts`) replaces the two remaining TypeScript-level `throw new Error(...)` + `err.message.includes(...)` string-matching call sites (`setWpointCommunes`'s commune/wilaya check, `updateCustomerProfile`'s commune/wilaya check) with a typed `.code` the error middleware branches on directly — `admin.ts`/`driver.ts`/`customer.ts` routes no longer string-match error messages at all. Audited: `grep -rn "message.includes"` across both `backend/` and `frontend/src/` now returns zero hits. |

## Phase 2 — Core booking domain
| Task | Status | Notes |
|---|---|---|
| 2.1 Formalize reservation state machine | **COMPLETE** (this batch) | States/transitions/actors/enforcement now documented as one explicit table in `agent/state-machines.md` §1, matching what the SQL already enforced (`reserve`, `confirm_reservation`, `cancel_reservation`, `sp_close_trip`, plus the two cascade triggers). Every legal transition and a representative set of illegal ones were exercised live against the real DB by `backend/DB/tests/live-verification.ts` (`npm run test:live`) — all passed. Noted (not fixed, flagged as a candidate follow-up): unlike the trip machine, there is no blanket `BEFORE UPDATE` trigger backstopping `reservation.status` — protection currently depends on all status-changing code going through the three guarded functions, which is true today but structurally weaker. |
| 2.2 Formalize trip lifecycle | **COMPLETE** (this batch) | States/transitions/actors documented in `agent/state-machines.md` §2. `trg_trip_status_guard` (a real `BEFORE UPDATE` trigger, not just procedure-level checks) is the backstop — confirmed live by a raw `db.update('trip', {status:'in_progress'}, ...)` bypass on a `completed` trip, which was still correctly rejected with `DZ304`. Every legal transition (`scheduled→in_progress→completed`, `scheduled→cancelled`) and illegal one (`in_progress→in_progress`, `completed→cancelled`, `cancelled→in_progress`) tested live and passed. |
| 2.3 Segment-based capacity | **COMPLETE** (this batch) | `seats_available(p_trip, p_from_wpoint default null, p_to_wpoint default null)` rewritten: both-null preserves the old whole-route-bottleneck behavior (used by `v_trip` overview); both-given returns remaining capacity for exactly that segment, via `[pickup_position, dropoff_position)` range overlap. `trg_reservation_capacity_guard` rewritten to use the same overlap logic instead of whole-trip seat summing. Wired through `tripSearch.ts` (search results now show true per-segment availability), new `GET /api/trips/:id/availability` route, and `TripDetailPage.tsx` (booking form's seat cap now reflects the selected segment, not the whole trip). Deployed to the live DB (`npm run db:init -- --force --schema-only`, 156 statements, data row counts unchanged). Proven live: on a capacity=1 trip, Alger→Blida and Blida→Djelfa reservations **both** succeeded (non-overlapping), while a second Alger→Blida and an Alger→Djelfa both correctly failed `DZ303` (overlapping). See `agent/state-machines.md` §3. |
| 2.4 Atomic seat reservation | **COMPLETE** (this batch) | Formal sign-off now recorded in `agent/state-machines.md` §4. The underlying mechanism (row-level locks via `for update` / unique `where status = ...` updates) was already correct and needed no code change this batch — it was tested live against all 4 checklist scenarios: capacity=1 double-booking race, approval race, cancellation race, and full-payment race, each as two simultaneous calls via `Promise.allSettled` — in every case exactly one call succeeded and the other was correctly rejected (`DZ303`/`DZ402`/`DZ503`). Expiration race intentionally not tested/applicable: Task 7.3 (payment holds/expiry) doesn't exist in the schema, so there is nothing to race. |

## Phase 3 — Partial-route booking
| Task | Status | Notes |
|---|---|---|
| 3.1 Partial-route trip search | **COMPLETE** (this batch) | Wilaya-level partial-route matching (join `wpoint` for both pickup/dropoff, require `wpt.position > wpf.position`) was already implemented from a prior session (corrected a stale "MISSING" rating last batch). This batch added the one genuinely missing piece — commune-level search: optional `from_commune_id`/`to_commune_id` query params on `GET /api/trips`, filtering to trips whose pickup/dropoff WPoint either has no curated commune subset configured or explicitly serves the requested commune (same convention as the admin WPoint editor's "unrestricted" meaning). Proven live: searching Alger→Blida filtered to a commune the WPoint actually serves finds the trip; filtered to one it doesn't serve excludes it. |
| 3.2 Partial-route booking | **COMPLETE** (prior batch, via 2.3) | Reservations already stored `pickup_wpoint_id`/`dropoff_wpoint_id` + optional GPS pins and priced via the exact `trip_price` row for that pair; capacity now also accounts for the segment (2.3). This batch additionally layered optional precise Commune selection on top (4.1), without changing anything this row already covered. |

## Phase 4 — Geolocation / pickup-dropoff validation
| Task | Status | Notes |
|---|---|---|
| 4.1 GPS validation | **COMPLETE** (this batch) | New `reservation.pickup_commune_id`/`dropoff_commune_id` columns + `set_reservation_communes()` SQL function validate a selected commune belongs to the stop's wilaya (`DZ203`) and, when the admin configured a curated subset for that stop (`wpoint_commune`), that it's in that exact subset (`DZ604`, new) — this directly satisfies "pickup/dropoff must belong to an allowed commune" and "...the selected trip coverage". ("Pickup/dropoff must belong to the selected trip's stops at all" was already covered by the pre-existing `DZ601` check in `reserve()`.) `setReservationGeo()` now rejects coordinates outside an Algeria bounding box (`DZ605`, new) — "reject invalid geographic coordinates". Frontend (`TripDetailPage.tsx`): new commune `<select>` pickers scoped to each stop's real coverage (via new public `GET /api/trips/:id/wpoints/:wpointId/communes`), and a "📍 Utiliser ma position actuelle" button using `navigator.geolocation` that falls back — on denial, timeout, or no browser support — to the pre-existing click-on-map picker ("handle GPS permission failure" + "provide manual map fallback", the latter of which already existed). All new server-side validation proven live: wrong-subset commune rejected `DZ604`, wrong-wilaya commune rejected `DZ203`, correct commune accepted, out-of-Algeria coordinates (tested with Paris) rejected `DZ605`, in-Algeria coordinates accepted. |
| 4.2 Direction validation | **COMPLETE** (correcting a stale earlier audit entry, prior batch) | Re-reading `reserve()` (`backend/data/init/sql.txt`) shows it already compares `v_pick_pos >= v_drop_pos` and raises `DZ603 INVALID_ROUTE_ORDER` before ever inserting a reservation — this is enforced server-side at booking time, not just in the search query's `wpt.position > wpf.position` join condition. The previous "MISSING" rating only looked at search, not `reserve()` itself. |
| 4.3 Live ETA | **COMPLETE** (this batch) | New `DomainRepository.estimateTripEtas(tripId)`: for every stop still on the trip, a haversine straight-line distance from the driver's (falling back to the vehicle's) last-known GPS ping to that stop's wilaya chief-town coordinate (`WILAYA_CENTROIDS`, moved to `DB/wilayaCentroids.ts` so the DB layer doesn't import from the API layer), divided by an assumed average intercity speed (55 km/h) — "current driver position" + "upcoming stops" + "estimated arrival". Deliberately returns `eta: null` + a `reason` instead of fabricating a number when the trip hasn't started (`not_in_progress`), no GPS ping ever arrived (`no_location`), the last ping is older than 20 minutes (`stale_location`), or a wilaya has no reference coordinate — exactly the brief's "do not fabricate ETA" instruction. "Update mechanism": computed fresh on every read from whatever the latest ping is (nothing cached/stale-by-design), driven by the existing driver location-ping flow; both UIs poll it every 30s. New routes: `GET /api/driver/trips/:id/eta` (all stops, driver's own trip) and `GET /api/reservations/:id/eta` (just the caller's own dropoff stop — deliberately never exposes the full stop list or raw driver coordinates to a customer, only a computed ETA + distance). "Driver display": `DriverPage.tsx`'s "Trajet en cours" tab gained a live per-stop ETA table. "Customer display": `MyReservationsPage.tsx` shows a live ETA line (with a manual refresh) on any `confirmed` reservation whose trip is `in_progress`. Proven live: scheduled trip → `not_in_progress` for every stop; in_progress with no ping ever → `no_location`; fresh ping → real ETA + distance for every stop, `position_age_seconds` < 60; the same ping backdated 40 minutes → `stale_location`. |

## Phase 5 — Driver booking operations
| Task | Status | Notes |
|---|---|---|
| 5.1 Driver approval workflow | **COMPLETE** (re-verified this batch) | `POST /api/driver/reservations/:id/confirm` / `/decline` exist, ownership-checked. "Capacity revalidation during approval" — re-examined closely this batch: `trg_reservation_capacity_guard` is attached `after insert or update of seats, status, trip_id` (not just `after insert`), so the `pending → confirmed` transition **already** re-fires the exact same capacity check that guards insert, recomputing held seats excluding the row itself. Proven live two ways: (1) confirming an already-valid pending reservation still succeeds (nothing changed, as expected); (2) with a capacity=2 trip fully held by two 1-seat pending reservations, directly bumping one reservation's `seats` to 2 (the same kind of UPDATE a confirm is) is live-rejected `DZ303` — proof the guard is a real, active backstop on every status/seat-affecting UPDATE, not just on INSERT. No code change was needed; this was a verification gap, not an implementation gap. |
| 5.2 Driver manifest | **COMPLETE** (this batch — corrects a stale "COMPLETE" rating) | Re-reading `getTripManifest()` and `DriverPage.tsx` this batch showed the existing manifest was only ever a **flat list of reservations** (pickup/dropoff *wilaya* names, no per-stop breakdown) — it never actually computed "for every stop: boarding passengers / alighting passengers / seat count entering / seat count leaving / remaining capacity" as the task explicitly specifies, despite the previous audit marking it COMPLETE. New `DomainRepository.getTripStopManifest(tripId)` now produces exactly that: iterates the trip's ordered stops, and for each one lists who boards there, who alights there, the seat deltas, the running aboard-count, and `capacity - aboard` as remaining capacity. Wired into `GET /api/driver/trips/:id` as `stop_manifest`, rendered as a new table in `DriverPage.tsx`'s "Trajet en cours" tab. Proven live on a 3-stop/5-capacity trip with 3 overlapping-segment reservations: per-stop entering/leaving/aboard-after/remaining all matched hand-computed expected values exactly. |
| 5.3 No-show system | **COMPLETE** (this batch) | New `no_show_event` append-only ledger (`kind` customer/driver, trip/reservation/customer/driver references) + cached `no_show_count`/`flagged_at` columns on `customer`/`driver`, kept in sync by `trg_no_show_event_apply` (fires after every insert, reads the configurable `app_setting.no_show_strike_threshold` — default 3 — and sets `flagged_at` once the count reaches it). **Customer no-show**: `sp_close_trip` (already the function that classifies an unresolved `confirmed` reservation as `no_show` by `amount_paid`) now also inserts the matching ledger row in the same statement — zero duplicated "was this a no-show" logic. **Driver no-show**: new `record_driver_no_show(trip, notes)` — admin-only, only legal on a `scheduled` trip (driver never started it; `DZ309` otherwise) — records the ledger row, cancels the trip, and cascades cancellation to its reservations. New admin routes: `GET /no-show-events` (filterable by kind/customer/driver), `GET`/`PUT /settings/no-show-threshold`, `POST /trips/:id/driver-no-show`; new `AdminPage.tsx` "Absences" tab (threshold editor + event log) and a "⚠ signalé" badge + count on the Chauffeurs/Clients tables; a "Absence conducteur" action button on scheduled trips. **Scope decision (user-directed)**: flag-only — reaching the threshold marks the account visibly for an admin to review; nothing is automatically blocked (no auto-suspension of booking/publishing). Proven live: an unpaid confirmed reservation auto-resolves to `no_show` on trip close **and** records a ledger row, bumping `customer.no_show_count` by exactly 1; a driver-no-show call on a `scheduled` trip cancels the trip + its pending reservation and records a ledger row; a second driver-no-show call on the now-cancelled trip is rejected `DZ309`. |

## Phase 6 — Driver KYC & trust
| Task | Status | Notes |
|---|---|---|
| 6.1 Driver KYC | **COMPLETE** (this batch) | New `kyc_document` table (append-only per submission — a correction/resubmission is a new row of the same `doc_type`, not a mutation of the rejected one, so the full review history survives; "current" status per type = the latest row). Real file upload (user-directed scope decision): `POST /api/driver/kyc` (multipart, `multer` disk storage under `backend/uploads/kyc/<driver_id>/`, 8MB cap, JPEG/PNG/WEBP/PDF only) for identity / license / vehicle_registration / insurance. New `kyc_approve`/`kyc_reject(reason)` SQL functions enforce the review state machine (`pending` → `approved`\|`rejected` only, `DZ702` if already reviewed, `DZ703` if no rejection reason given, `DZ701` if the document id doesn't exist) — admins can't double-review a document, and a rejection is never silent. Files are never served from a public/static path — `GET /api/driver/kyc/:id/file` (own documents only) and `GET /api/admin/kyc/:id/file` (any, admin-only) stream them through an auth-checked route. New `DriverPage.tsx` "Mes documents" tab (per-doc-type upload + status + rejection reason + resubmit) and `AdminPage.tsx` "KYC chauffeurs" review queue (filter by status, view file, approve/reject with a required reason). `reviewed_by` is deliberately a bare `uuid` with no FK to `app_user` — that table lives in a separately-bootstrapped auth schema (`api/authSchema.ts`) not guaranteed to exist yet when the domain schema (`sql.txt`) is installed standalone via `npm run db:init` on a fresh database. KYC approval is informational/trust-signal only at this stage — it does not yet gate trip publishing (that linkage is explicitly Task 6.2's "publish eligibility" concern). Proven live: submission starts `pending`; approve sets `approved` + reviewer + clears any prior rejection reason; a second approve on the same document is rejected `DZ702`; reject requires and records a reason; an empty reason is rejected `DZ703`; reviewing an unknown document id is rejected `DZ701`; a driver's full 3-document submission history is listable. |
| 6.2 Vehicle inspection | **COMPLETE** (this batch) | New `vehicle_inspection` table (append-only per submission, same "current = latest row" convention as `kyc_document`): `inspection_date`/`expiry_date`/`maintenance_status` (`ok`/`needs_service`/`out_of_service`) + optional uploaded file (multer, mirrors the KYC upload pattern exactly — `backend/uploads/vehicle_inspection/<vehicle_id>/`, 8MB cap, same MIME allowlist). `vehicle_inspection_approve`/`_reject(reason)` enforce a `pending`→`approved`\|`rejected` state machine (`DZ712` if already reviewed, `DZ713` if no rejection reason, `DZ711` if unknown id) — same shape as KYC's review workflow, no duplicated logic. New `vehicle_is_eligible(vehicle_id)` function — single source of truth, used both by `sp_publish_trip` (now rejects publishing with `DZ714` when the trip's assigned vehicle isn't eligible — only enforced when a vehicle is actually assigned, matching the existing optional-vehicle convention) and exposed to the UI so drivers/admins see the identical verdict. Driver routes: `GET`/`POST /api/driver/vehicle/inspections`, `GET /api/driver/vehicle/inspections/:id/file`. Admin routes: `GET /api/admin/vehicle-inspections` (review queue, filterable by status), `POST .../approve`, `POST .../reject`, `GET .../:id/file`, plus an `is_eligible` column added to the existing vehicle list. New `DriverPage.tsx` "Contrôle technique" tab (submit + history + eligibility banner) and `AdminPage.tsx` "Contrôles techniques" tab (review queue) + an eligibility chip on the "Véhicules" tab. Proven live: a vehicle with no inspection is ineligible and a trip assigned to it cannot be published (`DZ714`); rejecting without a reason is rejected (`DZ713`); reviewing an already-reviewed or unknown record is rejected (`DZ712`/`DZ711`); an approved-but-already-expired inspection leaves the vehicle ineligible; a newer approved/unexpired/OK one makes it eligible (and publishing then succeeds); an even-newer approved-but-`out_of_service` one makes it ineligible again — confirming `vehicle_is_eligible()` always keys off the single most recent *approved* record, not just any approved record. |
| 6.3 Ratings and reviews | **COMPLETE** (this batch) | New `rating` table — one row per (reservation, direction) pair, `direction` ∈ `customer_to_driver`/`driver_to_customer`, a check constraint enforces the rater/ratee columns are mutually exclusive per direction (a single table serves both directions without a discriminated pair of tables). `submit_rating()` only allows rating a reservation once its status is `completed` (`DZ721`), only by the actual party to that reservation (`DZ723`), and only once per direction (`DZ722`). `driver.rating_avg`/`rating_count` and `customer.rating_avg`/`rating_count` are maintained by a trigger that **recomputes from scratch** (never increments) every time a rating is inserted or its `hidden_at` changes — so admin moderation (hide/unhide) always keeps the cached average correct automatically, with no separate recompute step anywhere. New `trust_badge(rating_avg, rating_count, flagged_at)` function — one documented, single-source-of-truth threshold (avg ≥ 4.5, count ≥ 5, not no-show-flagged) used identically everywhere a "trusted" badge is shown. New routes: `POST`/`GET /api/reservations/:id/rate-driver`\|`/rating-status` (customer side), `POST`/`GET /api/driver/reservations/:id/rate-customer`\|`/rating-status` + `GET /api/driver/ratings` (driver side), `GET /api/admin/ratings` + `POST /api/admin/ratings/:id/moderate` (hide/unhide, a reason is required to hide — `DZ001` otherwise). UI: a "Noter le chauffeur"/"Noter le client" action appears on completed reservations in `MyReservationsPage.tsx`/`DriverPage.tsx`; `DriverPage.tsx` gained a "Mes évaluations" tab + a trust badge on the profile card; `AdminPage.tsx` gained an "Évaluations" moderation tab; driver/customer admin tables show the cached average. Proven live: rating a non-completed reservation is rejected; stars outside 1–5 rejected; rating from a non-owning party rejected; rating the same reservation/direction twice rejected; both directions succeed independently and `getReservationRatingStatus` reports them; `driver.rating_avg`/`rating_count` update correctly after a rating; hiding a rating (with a reason) recomputes the average back to pre-rating state, unhiding restores it. **SQL portability note** (fixed live): `submit_rating`'s `p_stars` parameter had to be declared `integer`, not `smallint` — this project's management-api SQL transport (`DB/sql-utils.ts`) inlines JS numbers as bare numeric literals, which Postgres parses as `integer`, and `int4→int2` is only an assignment cast, not an implicit one, so a `smallint` parameter made every call fail to resolve ("function does not exist") until fixed. |
| 6.4 Fraud/anomaly detection | **COMPLETE** (this batch) | New `list_fraud_signals()` — a single unified, deterministic (no ML) feed of plain auditable SQL predicates over data the schema already has: duplicate NIN (customer↔customer or customer↔driver), duplicate phone across roles, rapid cancel-then-rebook on the same trip (<10 min), repeated no-shows (reuses the Task 5.3 strike/flag mechanism as-is, just surfaced), suspicious online-payment behaviour (≥3 failed gateway payments for one customer within an hour — card-testing pattern), and a burst of ≥5 new customer accounts within a 10-minute window. Each row is a severity-tagged lead for manual admin review, never an automatic action. New `GET /api/admin/fraud-signals` route + `AdminPage.tsx` "Fraude" tab. Proven live: the function runs cleanly against the live demo+test data and returns a well-formed array (verified it doesn't error and returns the expected shape; the specific demo data's actual signal count is incidental, not asserted). |

## Phase 7 — Payment system
| Task | Status | Notes |
|---|---|---|
| 7.1 Real payment gateway | **COMPLETE (mock/sandbox adapter, user-directed scope)** | No real Algerian payment-gateway merchant credentials exist for this project, so — per explicit user direction — a provider-agnostic **mock/sandbox gateway** (`backend/api/payments/mockGateway.ts`) simulates one end-to-end with the exact architecture a real integration would use, so swapping in a real one later only means replacing this one file. `create_payment_intent()` reuses `record_payment()` for every existing validation (reservation exists/not cancelled/amount/overpay) and only adds gateway tagging (`payment.gateway`, `gateway_transaction_id`, new unique index) on top — no duplicated payment logic. New `POST /api/reservations/:id/checkout` (idempotent — reuses any still-open intent instead of piling up duplicates on repeated clicks) returns a `checkout_url` to a self-contained, unauthenticated, inline-styled HTML "hosted checkout" mock page (`GET /api/payments/checkout/:transactionId`) that simulates a bank page with success/failure buttons. `GET /api/reservations/:id/payments` lets the customer poll real payment status server-side — the client is never trusted to locally claim "paid". |
| 7.2 Payment webhook | **COMPLETE (mock/sandbox adapter)** | The mock checkout page's submit action makes a real, separate, signed HTTP call to `POST /api/payments/webhook/mock` (HMAC-SHA256 over the raw JSON body, `X-Mock-Gateway-Signature` header) — exactly like a real gateway's asynchronous server-to-server webhook, not a same-request shortcut. `gateway_apply_payment_event()` is the **only** place `payment.status` is ever flipped to `paid`/`failed` from a webhook; it is idempotent two ways — (1) once a payment is no longer `pending`, any further event for it is reported `duplicate` and ignored regardless of event id, (2) a literal replay of the same `(gateway, gateway_event_id)` is additionally caught by a unique index even in a race. A bad signature is reported `rejected` and never touches payment state. New append-only `payment_gateway_event` audit ledger records every delivery attempt (processed/duplicate/rejected) — including ones for an unknown payment id (logged with a null `payment_id` rather than crashing on an impossible foreign key, a real bug caught and fixed during live testing). A fully-paid online payment **auto-confirms** the reservation (`confirm_reservation()`, same capacity-revalidation guard as manual confirm — if capacity is gone by then the auto-confirm is simply skipped and recorded in the audit note for manual follow-up); manual/cash payments recorded by admin deliberately do not auto-confirm. New `GET /api/admin/payment-gateway-events` audit view + an expandable panel on `AdminPage.tsx`'s "Paiements" tab; `MyReservationsPage.tsx` has a "Payer en ligne" button that opens the checkout page in a new tab and polls the server (never the local tab) for the real outcome. Proven live (DB-level, `npm run test:live`): bad signature → `rejected`, payment untouched; unknown payment id → `rejected`, no crash; valid success → `processed`, payment `paid`, reservation auto-confirmed; literal replay of the same event id → `duplicate`, not re-processed; a brand-new event id against an already-resolved payment → also `duplicate`; valid failure → `processed`, `payment.status='failed'` + gateway-supplied `failure_reason`, reservation stays pending (no auto-confirm on failure); full audit trail correctly shows all 3 distinct attempts. Also proven live via manual curl against the real running HTTP server (not just the DB function directly) — see `agent/tasks.txt` notes: checkout page renders (200) while pending, 404s once resolved; tampered signature → HTTP 400 `{"result":"rejected"}`, state untouched; valid signature → HTTP 200 `{"result":"processed"}`; replay → HTTP 200 `{"result":"duplicate"}` (a duplicate/replay is correctly a non-error 200, telling a real gateway not to retry). |
| 7.3 Payment expiration | **MISSING** | No hold/expiry timestamp column on `reservation`/`payment`; nothing auto-releases an unpaid hold. |
| 7.4 Automated refunds | **MISSING** | Refunds (`refunded_amount`, refund-related `payment_status` values) are schema-ready but only settable by direct admin action — no automated refund trigger/job. |


## Phase 8 — Driver payouts
| Task | Status | Notes |
|---|---|---|
| 8.1 Driver payout ledger | **MISSING** | No payout/ledger table. |
| 8.2 Driver earnings dashboard | **MISSING** | No earnings aggregation route or UI. |
| 8.3 Payout scheduling/export | **MISSING** | — |

## Phase 9 — Pricing & monetization
| Task | Status | Notes |
|---|---|---|
| 9.1 Dynamic pricing | **MISSING** | Trip price is a flat field set at creation; no demand-based adjustment. |
| 9.2 Promo codes | **MISSING** | No promo/voucher table. |
| 9.3 Wallet | **MISSING** | No wallet/balance table. |
| 9.4 Referral system | **MISSING** | No referral table/field. |
| 9.5 PDF receipt/invoice | **MISSING** | No PDF-generation dependency or route anywhere in the codebase. |

## Phase 10 — Trip experience
| Task | Status | Notes |
|---|---|---|
| 10.1 Seat picker | **MISSING** | Reservations store a seat *count* only, no individual seat numbers/map. |
| 10.2 Waitlist | **MISSING** | No waitlist table/status. |
| 10.3 Recurring trips | **MISSING** | No recurrence rule field on `trip`/`trajectory`. |
| 10.4 Nearby-date fallback | **MISSING** | Search is exact date-range only (already extended to a range in a prior session), no "no results — try ±N days" fallback suggestion. |
| 10.5 Favorites | **MISSING** | No favorites/saved-trip table. |
| 10.6 Group bookings | **PARTIAL** | A single reservation already supports `seats > 1` (one party booking together), but no multi-passenger-detail or group-discount concept. |
| 10.7 Accessibility/service requirements | **MISSING** | No field for wheelchair access, child seat, etc. |

## Phase 11 — Communication
| Task | Status | Notes |
|---|---|---|
| 11.1 Notifications | **PARTIAL** | A real mailer abstraction exists (`sendMail`, used for OTP emails) and is reusable, but nothing calls it for reservation/trip lifecycle events (confirmed, cancelled, trip reminders, etc.) — infra present, event coverage missing. |
| 11.2 In-app messaging | **MISSING** | No messaging table/route. |
| 11.3 Masked calling | **MISSING** | No telephony integration. |
| 11.4 Shareable live-trip link | **MISSING** | No public/unauthenticated trip-tracking link route. |
| 11.5 SOS | **MISSING** | No SOS/incident table or route. |

## Phase 12 — Admin operations
| Task | Status | Notes |
|---|---|---|
| 12.1 Analytics | **MISSING** | No analytics route in `admin.ts`. |
| 12.2 Demand analytics | **MISSING** | — |
| 12.3 CSV/PDF exports | **MISSING** | No export route found. |
| 12.4 Admin audit log | **MISSING** | No audit-log table; admin actions are not recorded anywhere. |
| 12.5 Import history | **PARTIAL** | An `import_log` table already exists and is written to by the registry import tooling (wilaya/daira/commune counts) — just not surfaced in any admin UI screen yet. |
| 12.6 Granular admin roles | **MISSING** (confirmed again this session) | `session.ts` defines exactly 3 flat roles (`admin`/`customer`/`driver`); no admin sub-roles/permissions exist. |

## Phase 13 — Automation
| Task | Status | Notes |
|---|---|---|
| 13.1 Trip lifecycle scheduler | **MISSING** | No cron/scheduled job process found; all lifecycle transitions are user/admin-triggered. |
| 13.2 Payment-hold cleanup | **MISSING** | Depends on 7.3 (no hold/expiry concept yet to clean up). |
| 13.3 Waitlist promotion | **MISSING** | Depends on 10.2 (no waitlist exists). |
| 13.4 Reminder scheduler | **MISSING** | No scheduled reminder job. |

## Phase 14 — Security
| Task | Status | Notes |
|---|---|---|
| 14.1 Authorization audit | **PARTIAL→mostly COMPLETE for drivers** (this session) | `ownTripOrThrow` + reservation-driver-ownership checks in `driver.ts` are solid. One design note, not a bug: trajectories have **no owner column at all** — the code's own comment states "shared infrastructure — any driver may add routes" and the schema backs this (no `driver_id`/`created_by` on `trajectory`). This is an intentional shared-catalog model, not a missing-ownership-check bug; flagged here rather than silently "fixed," since restricting it would be a semantic change nobody asked for. Customer-side reservation ownership (`reservations.ts`, `req.user.customer_id` scoping) was spot-checked and looks correctly scoped. |
| 14.2 Rate limiting | **PARTIAL** (confirmed this session) | Global 240 req/min/IP + 15 req/min/IP on `/api/auth` already exist (`middleware/rateLimit.ts`, wired in `server.ts`). No per-route limits yet on search/booking/payment/SOS/messaging specifically. |
| 14.3 Fraud protection | **MISSING** | No fraud-signal detection (ties to 6.4). |

## Phase 15 — Internationalization & UX
| Task | Status | Notes |
|---|---|---|
| 15.1 Arabic | **MISSING** | No i18n framework (`react-intl`/`react-i18next`) in `frontend/package.json` or source; all copy is hardcoded French strings. |
| 15.2 English | **MISSING** | Same. |
| 15.3 Accessibility | **MISSING** | No `aria-*`/semantic-role attributes found anywhere in `frontend/src/pages`. |
| 15.4 Dark mode | **MISSING** | No theme toggle / CSS variables for dark mode found. |

## Phase 16 — PWA / client platform
| Task | Status | Notes |
|---|---|---|
| 16.1 PWA | **MISSING** | No `manifest.json`/service worker found anywhere in `frontend`. |
| 16.2 Web push | **MISSING** | — |

## Phase 17 — SMS
| Task | Status | Notes |
|---|---|---|
| 17.1 SMS notifications | **MISSING** | No SMS provider integration. |
| 17.2 SMS OTP | **MISSING** | OTP delivery today is email-only (`sendMail`); no SMS channel. |

## Phase 18 — Backup / recovery
| Task | Status | Notes |
|---|---|---|
| 18.1 Backup verification | **MISSING** | No backup-check tooling found in `backend/DB`. |
| 18.2 Point-in-time recovery | **MISSING** (depends on hosting, Supabase-level feature, not app code) | Nothing in-app to verify/trigger PITR. |

## Phase 19 — Testing
| Task | Status | Notes |
|---|---|---|
| 19.1 Domain tests | **PARTIAL** | Only `backend/DB/tests/sql-utils.test.ts` exists (offline SQL-generation/parsing tests, no DB needed) — no tests of `domain.ts` business logic itself. |
| 19.2 API tests | **MISSING** | No route-level/integration tests found. |
| 19.3 Concurrency tests | **MISSING** | No test exercises concurrent booking/capacity races. |
| 19.4 End-to-end booking test | **MISSING** | No e2e test harness (Playwright/Cypress etc.) in either package.json. |

## Phase 20 — Production hardening
| Task | Status | Notes |
|---|---|---|
| 20.1 Error handling | **PARTIAL→mostly COMPLETE** | Centralized `errorHandler` maps `ApiError`, Zod errors, domain `DZxxx` errors, and raw Postgres codes (23505/23503) to clean JSON responses already. |
| 20.2 Observability | **MISSING** | No structured logging/metrics/tracing beyond `console.log`/`console.error`. |
| 20.3 Health monitoring | **PARTIAL** (confirmed this session) | `/api/health` exists in `server.ts`, but only checks the process is up — no DB/scheduler/mail-provider sub-checks. |
| 20.4 Deployment verification | **MISSING** | No smoke-test/deploy-check script found. |

---
### Summary
- **COMPLETE**: 0.1, 0.2, 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2
- **PARTIAL**: 3.2 (fully covered jointly by 2.3+4.1), 10.6, 11.1, 12.5, 14.1, 14.2, 19.1, 20.1, 20.3
- **MISSING**: everything else — Phase 7 remainder (7.3, 7.4), Phases 8–9, 10 (minus 10.6), 11 (minus 11.1), 12 (minus 12.5), most of 13–18, most of 19, most of 20
- **BROKEN**: none found that weren't already fixed as part of 1.1 this batch.

Phases 0–7 of the original 20-phase backlog are now fully audited and, bar 7.3/7.4, complete.
Subsequent batches will continue top-down from Phase 7's remainder, 5 numbered tasks at a
time, per the standing instruction.

**Cross-cutting audit note (this batch):** after finding and fixing the `submit_rating`
int4-vs-smallint parameter-resolution bug (Task 6.3), a `grep -n "smallint" sql.txt` sweep for
the same bug class found two more live, pre-existing occurrences — `resolve_daira(p_wilaya_id
smallint, ...)` and `resolve_commune(p_wilaya_id smallint, ...)` — confirmed broken by a direct
live call (`function resolve_daira(integer, unknown) does not exist`). Both are currently
**dead code** (`DomainRepository.resolveDaira`/`resolveCommune` have no callers anywhere in
`backend/api/`), so this had no live-user impact, but was fixed anyway on the same pattern
(parameter type → `integer`, preceding `drop function if exists ... (smallint, text)`,
deployed via `db:init --force --schema-only`, confirmed live afterward). No further
`smallint`-typed function *parameters* remain in `sql.txt` (the sweep found only column types
and return-table-column types, which aren't subject to this overload-resolution issue).
