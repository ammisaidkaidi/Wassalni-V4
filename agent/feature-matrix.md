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
| 1.4 Refund worklist | **MISSING** | Not started this batch (hit 5-task cap). Admin has `v_refund_due`/refund_due in schema, but no dedicated admin UI/route lists it today — only generic reservation list exists. |
| 1.5 Contextual domain errors | **PARTIAL** | Generic `DZxxx` → message/description mapping exists (`explainDomainError`, `v_domain_errors`), and Zod validation errors are already readable. Not yet audited field-by-field for every route. |

## Phase 2 — Core booking domain
| Task | Status | Notes |
|---|---|---|
| 2.1 Formalize reservation state machine | **PARTIAL** | Transitions are enforced correctly but scattered across SQL functions (`reserve`, `confirm_reservation`, `cancel_reservation`, `sp_close_trip`) rather than documented as one explicit state table. No missing states found (pending/confirmed/completed/cancelled/no_show cover current use cases; no waitlist/rejected sub-states exist, nor are needed yet). |
| 2.2 Formalize trip lifecycle | **PARTIAL** | Same situation: `sp_publish_trip`/`start_trip`/`sp_close_trip`/`sp_cancel_trip` each guard their own legal transitions server-side; not centrally documented. |
| 2.3 Segment-based capacity | **MISSING** | Confirmed again this session: the capacity guard trigger sums reservation seats for the *whole trip*, not per pickup→dropoff segment. Two non-overlapping partial-route bookings on the same trip currently compete for the same whole-trip seat pool even if their segments don't overlap. Nontrivial (needs wpoint-position interval overlap logic) — flagged for a future batch, not attempted today. |
| 2.4 Atomic seat reservation | **PARTIAL** | `reserve()` SQL function does lock/check/insert in one transaction (row-level lock via `for update` pattern used elsewhere in the file) — concurrency-safe for whole-trip capacity, but inherits the 2.3 gap (not segment-aware). |

## Phase 3 — Partial-route booking
| Task | Status | Notes |
|---|---|---|
| 3.1 Partial-route trip search | **MISSING** | `GET /api/trips` only takes whole-trajectory `from`/`to` wilaya ids + date range. No "does this trip pass through my pickup/dropoff" search. |
| 3.2 Partial-route booking | **PARTIAL** | Reservations already accept `pickup_wpoint_id`/`dropoff_wpoint_id` + optional precise GPS pins, but pricing/capacity don't account for the segment (see 2.3). |

## Phase 4 — Geolocation / pickup-dropoff validation
| Task | Status | Notes |
|---|---|---|
| 4.1 GPS validation | **MISSING** | Customer/reservation GPS pins are stored (and now editable, 1.2) but nothing validates a pin is actually near the chosen wpoint/wilaya/commune. |
| 4.2 Direction validation | **MISSING** | No check that pickup wpoint precedes dropoff wpoint along the trajectory's stop order. |
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
