# Wassalni — React → Vue 3 Migration Plan

**Goal:** Rebuild the `frontend/` app (currently React 18 + TypeScript + Vite) as **Vue 3 + TypeScript + Vite**, with **zero functional change**: no feature added, no feature removed, no visible UX change. This is a 1:1 *transcription*, not a redesign.

**Out of scope / untouched:** `backend/` (Express + TypeScript + Postgres/Supabase). It is a pure JSON REST API with no framework coupling to the frontend — confirmed during the audit below. It needs **zero changes** for this migration.

---

## 0. Audit summary (what we're actually migrating)

| Area | Current React implementation |
|---|---|
| Build tool | Vite 5, `@vitejs/plugin-react`, dev+preview both on port 5173, `/api` proxied to `localhost:3000` |
| Routing | `react-router-dom` v6, `BrowserRouter`, 12 routes (incl. `/trips/:id`, `/track/:token`, catch-all) |
| Global state | 3 hand-rolled React Contexts: `AuthProvider` (session/user), `ThemeProvider` (light/dark, persisted + OS-detected), `I18nProvider` (fr/ar/en, custom dotted-key engine, RTL) |
| Pages | 10 files in `src/pages/` (137–2834 lines each) |
| Components | 8 reusable files in `src/components/` |
| Admin console | `AdminPage.tsx` (2834 lines) + `AdminExtras.tsx` (838 lines, 9 named tab components) — 25 tabs total, already organized into a categorized sidebar (Operations / Finance / Trust & Safety / System) |
| Maps | `react-leaflet` + `leaflet`, one wrapper component `TripMap.tsx` (route polylines, stop/pin markers, click-to-pick) |
| i18n | Custom engine (`i18n/engine.tsx`), 3 dictionaries (`ar.ts`, `en.ts`, `fr.ts`, ~1140 lines each), dotted-key lookup, `{{var}}` interpolation, French fallback |
| Data/HTTP layer | `api.ts` — plain `fetch` wrapper, zero React dependency already (session token as `?sid=` query param, not cookies; `ApiError`; multipart upload helper; a pub/sub hook for "DB unavailable" events) |
| Types | `types.ts`, 769 lines of plain TS interfaces — zero React dependency |
| PWA | `pwa.ts` (manual SW registration, no Workbox/vite-plugin-pwa), `public/sw.js`, `manifest.webmanifest`, `offline.html`, icon set — all plain JS/JSON/HTML, zero framework dependency |
| Native browser APIs | Web Push (`PushNotificationsCard.tsx`), Geolocation one-shot (`SosButton`, `ProfilePage`, `TripDetailPage`) and `watchPosition` live tracking (`DriverPage`), `beforeinstallprompt` (`InstallAppButton`) |
| Styling | One global `index.css` (1347 lines), plain CSS, dark mode via `[data-theme='dark']` attribute on `<html>`, RTL via `dir` attribute — no CSS-in-JS, no CSS modules |
| Accessibility | Custom `useFocusTrap` hook (modal focus trapping), skip-link, aria attributes throughout |
| Tests | None exist for the frontend today (backend has its own API/E2E tests, which talk to the HTTP API directly and are unaffected by this migration) |

---

## 1. Locked technical decisions (confirmed with user)

| Decision | Choice | Why |
|---|---|---|
| Global state | **Pinia** stores (`auth`, `theme`, `i18n`) | User's explicit preference; Vue's standard state library, one store per current Context |
| Maps | **Direct Leaflet.js calls** inside a Vue SFC (`onMounted`/`onUnmounted`), no wrapper library | User's explicit preference; avoids depending on a 3rd-party Vue-Leaflet package, closest possible 1:1 port of the imperative Leaflet API already in use under `react-leaflet`'s hood |
| i18n | **Port the custom engine as-is** into a Vue composable/store (same dictionaries, same dotted-key lookup, same French fallback, same RTL flag) | User's explicit preference; no new dependency, identical behavior guaranteed |
| Migration strategy | **Parallel build**: new `frontend-vue/` directory built and verified alongside the untouched `frontend/`, cutover (swap directories) only after full parity sign-off | User's explicit preference; lets both apps run side-by-side against the same backend for manual comparison, zero risk to the working React app while the Vue port is in progress |

---

## 2. Architecture mapping (React → Vue)

| React concept | Vue 3 equivalent |
|---|---|
| `ReactDOM.createRoot(...).render(<App/>)` | `createApp(App).mount('#root')` |
| `react-router-dom`: `BrowserRouter`, `Routes`/`Route`, `NavLink`, `useNavigate`, `useLocation` | `vue-router`: `createRouter(createWebHistory())`, `<router-view>`, `<RouterLink>`, `useRouter()`, `useRoute()` |
| React Context + Provider (`AuthProvider`, `ThemeProvider`, `I18nProvider`) | Pinia stores (`useAuthStore`, `useThemeStore`, `useI18nStore`), consumed via composables |
| `useState` | `ref()` / `reactive()` |
| `useEffect` | `onMounted` / `onUnmounted` / `watch` / `watchEffect` |
| `useMemo` / `useCallback` | `computed()` (Vue doesn't need manual memoized callbacks — functions declared in `<script setup>` are stable) |
| `useRef` (DOM ref) | `ref()` used as a template ref |
| `{cond && <X/>}` | `v-if="cond"` |
| `{list.map(x => <X key={x.id}/>)}` | `v-for="x in list" :key="x.id"` |
| Controlled `<input value={v} onChange={...}>` | `v-model="v"` |
| `react-leaflet` declarative `<MapContainer>/<Polyline>/<CircleMarker>` | Imperative `L.map()`, `L.polyline()`, `L.circleMarker()` built/updated in `onMounted`/`watch`, torn down in `onUnmounted` |
| Custom hook `useFocusTrap(ref, active)` | Composable `useFocusTrap(elRef, active)` using the same DOM logic, wired via `watch(active)` |
| `api.ts`, `types.ts`, `pwa.ts`, CSS, i18n dictionaries, `public/*` | **Unchanged, copied verbatim** — none of these import React |

---

## 3. Phases, tasks & subtasks

Ordered for **rapidity and low risk**: framework-agnostic code first (zero ambiguity, validates tooling), then global state, then the app shell, then components leaf-first, then pages simplest-first, then the two giant pages last, then cross-cutting verification, then cutover.

### Phase 0 — Environment & Scaffolding

**Task 0.1 — Scaffold the new Vue project**
- [ ] Create `frontend-vue/` at the repo root, sibling to `frontend/`
- [ ] Initialize with Vite + Vue 3 + TypeScript template (`<script setup>` style, Composition API)
- [ ] Install runtime deps: `vue`, `vue-router`, `pinia`, `leaflet` (no `react`, `react-dom`, `react-router-dom`, `react-leaflet`)
- [ ] Install dev deps: `@vitejs/plugin-vue`, `vue-tsc`, `typescript`, `@types/leaflet`
- [ ] Mirror `package.json` script names 1:1: `dev`, `build`, `preview`, `typecheck` (so CI/README instructions don't need to change)

**Task 0.2 — Port build & tooling config**
- [ ] `vite.config.ts`: copy the `/api` → `http://localhost:3000` proxy config verbatim (dev **and** preview blocks), same `host: '0.0.0.0'`, same `allowedHosts: true`
- [ ] Use a **different port temporarily** (e.g. 5174) during the build-out so React (5173) and Vue can run side-by-side against the same backend; switch to 5173 only at cutover (Phase 11)
- [ ] `tsconfig.json`: same strictness (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`), adapted for `vue-tsc` (`vueCompilerOptions` as needed)
- [ ] Directory skeleton: `src/pages/`, `src/components/`, `src/i18n/`, `src/stores/` (new — replaces Context), `src/composables/` (new), `src/router/` (new) — **keep the `pages/` folder name identical** to the React app (not `views/`) to make side-by-side diffing effortless during the audit phases

**Task 0.3 — Smoke-test the scaffold**
- [ ] Confirm a blank Vue page renders at the dev port
- [ ] Confirm the `/api` proxy works (hit `/api/init-db/status` from a throwaway component, see JSON come back)

---

### Phase 1 — Framework-agnostic foundation (do first: zero ambiguity, unblocks everything else)

**Task 1.1 — Port static/data files verbatim (no edits needed, they have zero React dependency)**
- [ ] Copy `types.ts` as-is
- [ ] Copy `i18n/ar.ts`, `i18n/en.ts`, `i18n/fr.ts` as-is (pure data objects)
- [ ] Copy `index.css` as-is; import once in the new `main.ts`
- [ ] Copy `public/` wholesale: `manifest.webmanifest`, `sw.js`, `offline.html`, `icons/*`

**Task 1.2 — Port `api.ts` verbatim**
- [ ] Copy file unchanged: `ApiError`, `getSessionToken`/`setSessionToken`, `withSessionParam`, `fileUrl`, `apiUpload`, `api()`, `fmtDateTime`/`fmtDate`, `setDbUnavailableHandler`/`dbUnavailableHandler` pub/sub
- [ ] Smoke-test: call `api('/api/init-db/status')` from a scratch component, confirm identical behavior to the React app

**Task 1.3 — Port `pwa.ts` verbatim**
- [ ] Copy `registerServiceWorker()` unchanged; call it from `main.ts`

**Task 1.4 — Port `index.html`**
- [ ] Copy unchanged except `<script src="/src/main.tsx">` → `<script src="/src/main.ts">`; keep every meta tag, manifest link, icon link, title, description identical

---

### Phase 2 — Global state layer (Pinia stores, replacing React Context)

**Task 2.1 — Auth store** (replaces `auth.tsx`)
- [ ] `src/stores/auth.ts`: state `{ user, loading }`
- [ ] Port `refresh()` 1:1, including the edge case: on a 401 from `/api/auth/me` with a stored session token, clear the dead token (`setSessionToken(null)`) so it isn't resent
- [ ] Port `logout()` 1:1 (`POST /api/auth/logout`, clear token, clear user, swallow network errors)
- [ ] Call `refresh()` once on store creation (replaces the `useEffect(() => { void refresh() }, [])` in `AuthProvider`)

**Task 2.2 — Theme store** (replaces `theme.tsx`)
- [ ] `src/stores/theme.ts`: state `{ theme }`
- [ ] Port `detectInitialTheme()` verbatim (localStorage → OS `prefers-color-scheme` → `'light'` fallback)
- [ ] Port `setTheme`/`toggleTheme`, persisting to the same `wassalni_theme` localStorage key
- [ ] `watch(theme)` → set `document.documentElement.dataset.theme` (replaces the `useEffect`)

**Task 2.3 — i18n store + composable** (replaces `i18n/engine.tsx` + `i18n/index.tsx`)
- [ ] `src/i18n/engine.ts`: port `lookup()`, `interpolate()`, `detectInitialLang()` as pure functions, unchanged logic
- [ ] `src/stores/i18n.ts`: state `{ lang }`, computed `dir`, `setLang()` persisting to the same `wassalni_lang` key, `t(key, vars)` with the same French-fallback-then-raw-key behavior (incl. the `import.meta.env.DEV` console warning on a missing key)
- [ ] `watch([lang, dir])` → set `document.documentElement.lang` / `.dir` (replaces the `useEffect`)
- [ ] Re-export `LANGS` and the `Lang` type unchanged

**Task 2.4 — Focus-trap composable** (replaces `useFocusTrap.ts`)
- [ ] `src/composables/useFocusTrap.ts`: same `FOCUSABLE_SELECTOR`, same Tab/Shift+Tab cycling logic, same focus-restore-on-close behavior; adapt the dependency array to a Vue `watch(() => active.value, ...)`

**Task 2.5 — "DB unavailable" wiring**
- [ ] Confirm `setDbUnavailableHandler` (from Task 1.2, untouched) is wired from `App.vue`'s `onMounted` exactly like it was from `App.tsx`'s `useEffect` (redirect to `/init-db` via the router)

---

### Phase 3 — Routing & app shell

**Task 3.1 — Router**
- [ ] `src/router/index.ts`: `createRouter(createWebHistory())` with the same 12 routes, in the same order: `/`, `/trips/:id`, `/login`, `/register`, `/reservations`, `/wallet`, `/profile`, `/driver`, `/admin`, `/track/:token`, `/init-db`, catch-all `*` → not-found
- [ ] **Optimization (allowed — internal, not a feature change):** lazy-load the two heavy pages (`AdminPage`, `DriverPage`) via dynamic `import()` in the route definitions for smaller initial bundle/faster first paint — purely a build-time change, zero behavior difference to the user

**Task 3.2 — `App.vue` shell** (replaces `App.tsx`)
- [ ] Skip-link (`<a href="#main-content">`)
- [ ] Topbar: brand link, hamburger `menu-toggle` button with the same `aria-label`/`aria-expanded`/`aria-controls`, `topbar-panel` div with the same `open` class toggling
- [ ] Outside-click-closes-menu: `onMounted`/`onUnmounted` document listener, same logic, using a template ref for the header element
- [ ] Close-menu-on-navigation: `watch(() => route.path, () => { menuOpen = false })`
- [ ] Nav links as `<RouterLink>` with the same `v-if` guards (`user?.customer_id`, `user?.role === 'driver'`, `user?.role === 'admin'`)
- [ ] Language `<select v-model>` bound to the i18n store
- [ ] Theme toggle button (`@click="toggleTheme"`, same `aria-pressed`, same emoji swap)
- [ ] Auth-state-dependent right side: logged-in → `NotificationBell` + name + logout button; logged-out → login/register links — ported once the relevant components exist (Phase 4)
- [ ] `<router-view />` replacing `<Routes>...</Routes>`
- [ ] Footer, unchanged

**Task 3.3 — `main.ts` entry point**
- [ ] `createApp(App).use(createPinia()).use(router).mount('#root')`
- [ ] Call `registerServiceWorker()`
- [ ] Import `index.css`

---

### Phase 4 — Shared components (leaf-first, per the confirmed dependency graph)

**Task 4.1 — Leaf components (no internal cross-component dependencies)**
- [ ] 4.1.1 `InstallAppButton.vue`
- [ ] 4.1.2 `SosButton.vue` (one-shot `navigator.geolocation.getCurrentPosition`, ported verbatim)
- [ ] 4.1.3 `SeatPicker.vue`
- [ ] 4.1.4 `NotificationBell.vue` (30s polling via `onMounted`/`onUnmounted` + `setInterval`)
- [ ] 4.1.5 `PushNotificationsCard.vue` (Notification permission + `pushManager.subscribe`/`getSubscription`, ported verbatim)
- [ ] 4.1.6 `ReservationExtras.vue`
- [ ] 4.1.7 `CommuneSelectorModal.vue` (consumes `useFocusTrap` from Task 2.4)
- [ ] 4.1.8 `TripMap.vue` — the Leaflet port:
  - imperative `L.map()` created in `onMounted`, destroyed in `onUnmounted`
  - `watch(() => [props.stops, props.pins, props.pickedMarkers])` to redraw the polyline/markers (replaces the `key`-forced-remount trick from `react-leaflet`)
  - `onPick` click handler wired via `map.on('click', ...)` (replaces the `useMapEvents` helper component)
  - identical marker styling (colors, radii, tooltip direction/offset/permanent flag)

**Task 4.2 — Composed components**
- [ ] 4.2.1 `WpointManager.vue` (depends on `CommuneSelectorModal.vue`)
- [ ] 4.2.2 `CustomerExtras.vue` (depends on `SosButton.vue`)

**Task 4.3 — Per-component parity checklist** (apply to every component above before moving on)
- [ ] Props/emits interface matches the original props/callback signature 1:1
- [ ] Every conditional render branch from the `.tsx` source is present
- [ ] Every event handler is wired
- [ ] All `aria-*`/accessibility attributes preserved

---

### Phase 5 — Simple, low-interdependency pages (validate page-level patterns before the two giant pages)

Ordered by ascending complexity:
- [ ] 5.1 `RegisterPage.vue`
- [ ] 5.2 `LoginPage.vue`
- [ ] 5.3 `HomePage.vue`
- [ ] 5.4 `ShareTrackingPage.vue` (15s polling)
- [ ] 5.5 `WalletPage.vue`
- [ ] 5.6 `InitDbPage.vue` (8s status polling, setup/diagnostics forms — this is the self-service `/init-db` feature from the prior task; preserve exactly, including the `WWW-Authenticate`-header-free Basic-Auth fix already shipped)
- [ ] 5.7 `ProfilePage.vue` (depends on `CustomerExtras.vue` + `PushNotificationsCard.vue` from Phase 4; one-shot geolocation for pickup point)

---

### Phase 6 — Complex pages (last, since they compose the most ported pieces)

**Task 6.1 — `TripDetailPage.vue`**
- [ ] Depends on `SeatPicker.vue`, `TripMap.vue`
- [ ] One-shot geolocation flow ported verbatim

**Task 6.2 — `MyReservationsPage.vue`**
- [ ] Depends on `ReservationExtras.vue`
- [ ] 30s polling, ported verbatim

**Task 6.3 — `DriverPage.vue`** (1859 lines — the largest non-admin page)
- [ ] Depends on `PushNotificationsCard.vue`, `ReservationExtras.vue`, `SosButton.vue`, `TripMap.vue`, `WpointManager.vue`
- [ ] Live tracking: `navigator.geolocation.watchPosition`/`clearWatch` ported verbatim (start/stop lifecycle tied to `onMounted`/`onUnmounted` + a reactive "tracking active" flag)
- [ ] ETA 30s polling ported verbatim
- [ ] **Internal-only optional refactor** (no behavior change): split into smaller composables (e.g. `useDriverTracking`) purely for maintainability, if it doesn't risk introducing regressions — optional, can be skipped if it adds risk

**Task 6.4 — Admin tab components** (replaces `AdminExtras.tsx`'s 9 named exports)
- [ ] Port each of the 9 tabs as its own `.vue` SFC under `src/pages/admin-tabs/` (Vue convention is one component per file, unlike the single-file multi-export React version): `AuditLogTab`, `AnalyticsTab`, `RecurringTemplatesTab`, `ImportHistoryTab`, `AdminsTab`, `SosAdminTab`, `SettingsTab`, `ExportsTab`, `WaitlistAdminTab`
- [ ] Each tab's props/data-fetching/behavior ported 1:1, no logic changes

**Task 6.5 — `AdminPage.vue`** (2834 lines — ports last, composes everything above)
- [ ] Port the remaining ~15 inline tabs defined directly in `AdminPage.tsx` (enumerate exact list against the React source file-by-file while implementing, to avoid missing one)
- [ ] Port the categorized sidebar exactly as previously implemented in React (Task 3 of the prior work): 4 categories — **Operations** (Trips, Trajectories, Drivers, Vehicles, Vehicle Inspections, Tracking, No-show, Reservations, Customers, Ratings, Waitlist, Recurring), **Finance** (Payments, Promo codes, Payouts), **Trust & Safety** (KYC, Fraud signals, Errors, SOS), **System** (Analytics, Audit log, Import history, Admins, Settings, Exports)
- [ ] Sidebar persistent/docked on desktop, collapsible behind a hamburger icon on narrow screens — same breakpoint as the React version
- [ ] Categories as a **collapsible accordion** inside the sidebar — same open/close behavior
- [ ] Preserve the `pendingRefunds` badge on Payments and `openSos` badge on SOS exactly
- [ ] Preserve active-tab routing/state behavior exactly
- [ ] RTL check: sidebar docking side flips correctly under `dir="rtl"` (re-use whatever CSS mechanism — logical properties or `[dir="rtl"]` selectors — the React version used; copy it verbatim since the CSS file itself is unchanged from Phase 1)

---

### Phase 7 — PWA & native browser API verification

- [ ] 7.1 Service worker registers correctly; precache/offline fallback (`offline.html`) behaves identically (the SW file itself is byte-identical, copied in Phase 1 — this task is about confirming the *registration* and page lifecycle around it still work)
- [ ] 7.2 Web Push: full subscribe → receive → unsubscribe cycle tested against the real backend VAPID keys
- [ ] 7.3 Geolocation: `SosButton` one-shot, `DriverPage` live `watchPosition` tracking, `ProfilePage`/`TripDetailPage` one-shot pickup-point pick — all tested
- [ ] 7.4 `InstallAppButton`: `beforeinstallprompt` capture + prompt flow tested

---

### Phase 8 — i18n, RTL & theming full pass

- [ ] 8.1 All 3 dictionaries load; `t()` fallback-to-French-then-raw-key behavior verified against the original
- [ ] 8.2 `dir`/`lang` attribute toggling verified across **every** page (not just Admin) when switching to Arabic
- [ ] 8.3 Dark/light toggle + persistence + first-visit OS-preference detection verified across every page/component
- [ ] 8.4 Missing-translation-key dev warning still fires in dev mode only

---

### Phase 9 — Full feature/regression parity audit

- [ ] 9.1 Build a page-by-page, component-by-component checklist from this plan's inventory and tick off each `.tsx` → `.vue` port as verified
- [ ] 9.2 Re-verify all 25 admin tabs individually, including both badges and any role-gated tab visibility (`admin_role` conditions, if present in the original)
- [ ] 9.3 Role-based nav/route-access parity: confirm the Vue app's handling of a customer visiting `/admin` or `/driver` directly matches the React app's behavior exactly (replicate with a `vue-router` navigation guard only if the React version actually guarded it — otherwise leave equally unguarded, to avoid adding a feature)
- [ ] 9.4 Form validation & error-message parity across Login/Register/Profile/TripDetail/Admin forms
- [ ] 9.5 Polling-interval parity: NotificationBell 30s, DriverPage ETA 30s, MyReservationsPage 30s, ShareTrackingPage 15s, InitDbPage 8s — confirm each interval matches exactly
- [ ] 9.6 Accessibility parity: skip-link, aria-labels, focus trap in every modal, keyboard navigation (Tab/Shift+Tab cycling, Escape handling left to callers as in the original)

---

### Phase 10 — Build, proxy & environment parity

- [ ] 10.1 `vite build` + `vite preview` proxy behavior confirmed identical to dev mode
- [ ] 10.2 Run the **existing, untouched backend test suites** (`test:api`, `test:e2e`, `test:smoke`) against the Vue frontend's live requests to prove wire-level compatibility — these tests talk to the HTTP API directly, so they should pass unmodified
- [ ] 10.3 `vue-tsc --noEmit` passes clean with the same strictness as the original `tsconfig.json`
- [ ] 10.4 Production bundle sanity check (size, no console errors, no regressions)

---

### Phase 11 — Cutover & cleanup

- [ ] 11.1 Final side-by-side sign-off: both apps running (React on its port, Vue on its temp port) against the same backend; manual pass through every route in both apps for comparison
- [ ] 11.2 Swap: stop the React dev server; move `frontend/` aside (e.g. `frontend-react-legacy/`, kept until confident, then removed — git history preserves it regardless); rename `frontend-vue/` → `frontend/`; switch its dev/preview port back to 5173
- [ ] 11.3 Update root `README.md`: swap the "React + Vite" labels/architecture diagram to "Vue 3 + Vite"
- [ ] 11.4 Remove the legacy React folder once confirmed unnecessary; clean `npm install` in the final `frontend/`
- [ ] 11.5 Commit and push the completed migration to GitHub
- [ ] 11.6 Clear commit message/tag marking the migration complete (e.g. "Vue 3 migration: full 1:1 port from React, no feature changes")

---

## 4. Why this ordering (rapidity, success, optimization)

1. **Framework-agnostic code first (Phase 1)** — `api.ts`, `types.ts`, CSS, i18n dictionaries, and all `public/` assets need **zero logic changes**. Porting them first is pure "copy and verify the tooling works," producing fast wins and proving the Vite/TS scaffold is correctly configured before any Vue-specific code is written.
2. **Global state before UI (Phase 2)** — every page depends on auth/theme/i18n; building these stores before any component avoids rework.
3. **Leaf components before composed components (Phase 4)** — `WpointManager` and `CustomerExtras` wrap other components, so porting their dependencies first means no component is ever built against an unfinished dependency.
4. **Simple pages before complex pages (Phase 5 before 6)** — validates the page-level conversion patterns (polling, forms, modals) on small surface area before tackling `DriverPage` (1859 lines) and `AdminPage` (2834 lines), where mistakes would be expensive to find.
5. **The two giant pages last among pages** — by the time they're ported, every component and pattern they use has already been built and proven elsewhere.
6. **Cross-cutting verification phases (7–9) after all pages exist** — browser-API, i18n/RTL/theme, and full regression audits are naturally end-to-end concerns; running them once against the complete app is more efficient than re-checking after every single page.
7. **Parallel-build strategy throughout** — the React app keeps running untouched the entire time, so there is no window where the live product is broken, and every Vue page can be compared side-by-side against its still-running React original.

---

## 5. Explicit non-goals (guardrails)

- `backend/` is not modified in any way.
- No feature is added beyond what already exists in the React app (code-splitting/lazy-loading of routes is an internal build optimization, not a user-facing feature, and is the only "extra" explicitly allowed above).
- No feature, page, button, badge, tab, or behavior is removed.
- No visual/UX change beyond what's strictly unavoidable from the framework switch (there should be none — same CSS file, same class names, same markup structure).
- No change to the database schema, API contracts, or the session/auth mechanism (the `?sid=` query-param scheme is kept exactly as-is).

## 6. If something doesn't map cleanly

The current React dependency footprint is intentionally lean (`react`, `react-dom`, `react-router-dom`, `leaflet`, `react-leaflet` — no Redux, no React Query, no UI kit, no CSS-in-JS), so no library in this stack is expected to lack a clean Vue equivalent. If an edge case is discovered during implementation that doesn't map cleanly to the locked decisions above, implementation will pause and the user will be asked a concrete, scoped question before proceeding — not guessed at.
