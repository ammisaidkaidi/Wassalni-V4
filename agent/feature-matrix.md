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
| 4.3 Live ETA | **PARTIAL** | Driver live-location tracking exists (`vehicle_last_location`, `navigator.geolocation.watchPosition` in `DriverPage.tsx`) and is shown on maps, but no ETA computation (distance/speed → time) exists anywhere. |

## Phase 5 — Driver booking operations
| Task | Status | Notes |
|---|---|---|
| 5.1 Driver approval workflow | **COMPLETE** | `POST /api/driver/reservations/:id/confirm` and `/decline` exist, ownership-checked (driver can only act on reservations of their own trips, verified via `ownTripOrThrow`-adjacent checks at driver.ts:434-448). |
| 5.2 Driver manifest | **COMPLETE** | `repo.getTripManifest(tripId)` returned from the trip detail route. |
| 5.3 No-show system | **PARTIAL** | `sp_close_trip` auto-classifies unresolved confirmed reservations as completed/no_show by `amount_paid` at close time — but there's no manual "mark this specific passenger no-show" action before/independent of closing the whole trip. |

## Phase 6 — Driver KYC & trust
| Task | Status | Notes |
|---|---|---|
| 6.1 Driver KYC | **MISSING** | No KYC/verification-status columns on `driver`, no document upload, no admin review queue. |
| 6.2 Vehicle inspection | **MISSING** | No inspection table/fields on `vehicle`. |
| 6.3 Ratings and reviews | **MISSING** | No rating/review table in schema at all. |
| 6.4 Fraud/anomaly detection | **MISSING** | No fraud-signal table or heuristic job. |

## Phase 7 — Payment system
| Task | Status | Notes |
|---|---|---|
| 7.1 Real payment gateway | **MISSING** | `record_payment()` is manual/admin-entry only (method + reference text); no gateway SDK/API integration. |
| 7.2 Payment webhook | **MISSING** | No webhook route exists anywhere in `backend/api/routes`. |
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
- **COMPLETE**: 0.1, 0.2, 1.1, 1.2, 1.3, 5.1, 5.2
- **PARTIAL**: 1.5, 2.1, 2.2, 2.4, 3.2, 4.3, 5.3, 10.6, 11.1, 12.5, 14.1, 14.2, 19.1, 20.1, 20.3
- **MISSING**: everything else (the large majority — Phases 6–9, 11 (minus 11.1), 12 (minus 12.5), most of 13–18, most of 19, most of 20)
- **BROKEN**: none found that weren't already fixed as part of 1.1 this batch.

This is a large remaining backlog (~60 MISSING items). Subsequent batches will keep working
top-down through the phases, 5 numbered tasks at a time, per the standing instruction.
