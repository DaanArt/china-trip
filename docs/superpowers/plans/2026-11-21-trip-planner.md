# China Trip Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A shared, map-centred planner where Daan and Cynthia build their 17 April – 17 June 2027 China trip: stops, legs, reservations with files, derived to-dos, a day-by-day timelapse, a wishlist with idea pins, and a Claude check script.

**Architecture:** A static Vite + React + TypeScript app on GitHub Pages (DaanArt) talks directly to Supabase (auth, Postgres with RLS, Realtime, Storage). All trip logic (dates, to-dos, timelapse position, check-write validation) lives in pure, unit-tested functions under `src/domain/`. The UI loads all trip tables into one provider, refetches on any Realtime change, and derives the route and to-dos from that snapshot.

**Tech Stack:** Vite, React 19, TypeScript, Vitest, Leaflet + react-leaflet 5, @supabase/supabase-js 2, tsx (scripts), Supabase CLI via `npx supabase`, GitHub Actions → Pages.

**Spec:** `docs/superpowers/specs/2026-11-21-trip-planner-design.md`

## Global Constraints

- Trip: start `2027-04-17`, end `2027-06-17`, 61 nights. 17 April is the **arrival** day at the first stop.
- No Google anything: no Google Maps, Fonts, Firebase or Google-hosted CDNs. Use system fonts.
- Supabase project ref `rbfdovrgylrvhwahyusz` (name `china-trip`, region eu-west-1). Only the URL and the anon/publishable key go in the app. **Never print, copy or commit the `service_role`/secret key**, and when listing API keys, filter the output so it never enters the transcript.
- No trip data or attachments in the repo. `.env.claude` (Claude's Supabase login) is gitignored.
- Git: local repo config only, `user.name "DaanArt"`, `user.email "24526729+DaanArt@users.noreply.github.com"`. Never change global git config. Push with `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`. The keychain default is the work account.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- UI copy in English. Dates in to-dos use `17 Apr`, ranges `17–22 Apr` / `29 Apr–2 May` (en dash), long form `17 June`.
- All date math on `YYYY-MM-DD` strings via UTC. Never `new Date('2027-04-17')` followed by local getters.
- Map: Leaflet with free, keyless, non-Google raster tiles. Use `CircleMarker`s, not default image markers (Vite breaks Leaflet's default icon paths).
- Geocoding: Photon (`https://photon.komoot.io/api/?q=…&limit=5&lang=en`, reverse `…/reverse?lat=…&lon=…&lang=en`). Search on Enter or after a 400 ms debounce, never per keystroke.
- Single trip: the app reads the one `trip` row; every table carries `trip_id`.

## Review Focus

1. **Empty trip (no stops yet):** this is day one for the users. The app must render, the to-do list must show only "61 nights still unplanned before 17 June", and the timelapse must show every day as unplanned. Pinned in Task 3 and Task 4 tests.
2. **Date shift from time zones:** the users may open the app in China (UTC+8) or the Netherlands. Every date must be identical in both. Pinned in Task 2 by tests that run under `TZ=Asia/Shanghai` and `TZ=America/Los_Angeles`.
3. **Bad nights input** (empty, negative, decimal, `NaN`): treat as clamped integers ≥ 0, never as a crash or an `Invalid Date`. Pinned in Task 3.
4. **Two people reordering at once, leaving duplicate `position` values:** the order must stay stable (tie-break on `created_at`), and the next move must renumber cleanly. Pinned in Task 3 (sort) and Task 8 (renumber on move).
5. **Deleting a stop that has reservations:** the user must confirm with a count first ("Delete Xi'an and its 2 reservations?"). Idea/place pins on it become idea pins (`on delete set null`), not lost. Pinned in Task 6 (FK rules) and Task 8 (confirm).

---

## File Structure

```
.github/workflows/deploy.yml     build + deploy to Pages
supabase/migrations/…_init.sql   schema, RLS, storage bucket, realtime
scripts/check-access.ts          RLS smoke test (anon sees nothing; Claude sees trip)
scripts/trip-check.ts            Claude check: export / apply
src/domain/types.ts              row types (snake_case, mirror DB)
src/domain/dates.ts              addDays, diffDays, formatDay, formatRange, formatDayLong
src/domain/route.ts              buildRoute, legKey
src/domain/todos.ts              deriveTodos
src/domain/geo.ts                haversineKm, estimateHours, formatHours
src/domain/timelapse.ts          tripDays, locateDay
src/domain/checkApply.ts         planCheckWrites
src/lib/supabase.ts              client
src/lib/photon.ts                searchPlaces, reverseGeocode
src/data/TripDataProvider.tsx    load all tables, realtime refetch, useTrip()
src/data/actions.ts              all mutations
src/auth/                        useSession.ts, Login.tsx, NamePrompt.tsx
src/ui/                          App.tsx, map/, panels/, Timelapse.tsx, styles.css
CLAUDE.md                        how to run the check, deploy, access test
```

---

### Task 1: Scaffold, git, test runner

**Files:**
- Create: Vite React-TS scaffold in repo root, `.gitignore`, `vite.config.ts`, `index.html`
- Test: `src/domain/smoke.test.ts` (deleted in Task 2)

**Interfaces:**
- Produces: `npm test` (vitest run), `npm run build` (tsc + vite build), `npm run dev`; Vite `base: '/china-trip/'`.

- [ ] **Step 1:** In `/Users/daanvandervorm/Documents/Daan/china_trip`, run `npm create vite@latest . -- --template react-ts` (the folder holds only `docs/`; keep it). Then `npm i @supabase/supabase-js leaflet react-leaflet` and `npm i -D vitest tsx @types/leaflet`.
- [ ] **Step 2:** Set `base: '/china-trip/'` and `test: { environment: 'node' }` in `vite.config.ts`. Add scripts `"test": "vitest run"` and `"check-access": "tsx scripts/check-access.ts"`. Add `<meta name="robots" content="noindex,nofollow">` and the title `China Trip` to `index.html`. Remove the Vite demo content and any Google font references.
- [ ] **Step 3:** In `.gitignore`, add `.env.claude`, `.env.local`, `supabase/.temp`, `.DS_Store`.
- [ ] **Step 4:** Write `src/domain/smoke.test.ts` with `expect(1 + 1).toBe(2)`. Run `npm test`. Expected: 1 passed. Run `npm run build`. Expected: success.
- [ ] **Step 5:** Run `git init -b main`, then `git config user.name "DaanArt"` and `git config user.email "24526729+DaanArt@users.noreply.github.com"` (local). Commit everything, including `docs/`: `chore: scaffold Vite React app, add design spec and plan`.

### Task 2: Domain types and date utilities

**Files:**
- Create: `src/domain/types.ts`, `src/domain/dates.ts`
- Test: `src/domain/dates.test.ts`
- Delete: `src/domain/smoke.test.ts`

**Interfaces:**
- Produces, in `types.ts` (all ids are `string`, all timestamps ISO `string`):
  - `ISODate = string`, `Mode = 'train'|'flight'|'bus'|'car'|'other'`
  - `Trip {id, name, start_date, end_date, home_label}`
  - `Stop {id, trip_id, position: number, name, name_zh: string|null, lat: number, lng: number, nights: number, no_booking_needed: boolean, no_booking_note: string|null, notes: string|null, created_by: string|null, created_at}`
  - `Leg {id, trip_id, from_stop_id: string|null, to_stop_id: string|null, mode: Mode, overnight: boolean, no_booking_needed: boolean, no_booking_note: string|null, manual_hours: number|null, notes: string|null, created_by, created_at}`
  - `ReservationKind = 'hotel'|'transport'|'activity'|'other'`; `Reservation {id, trip_id, stop_id: string|null, leg_id: string|null, kind, title, confirmation: string|null, start_date: ISODate|null, start_time: string|null, end_date: ISODate|null, end_time: string|null, address: string|null, address_zh: string|null, details: string|null, created_by, created_at}`. Hotel: `start_date` = check-in, `end_date` = check-out. Transport: `start_date` = departure, `end_date` = arrival.
  - `Attachment {id, reservation_id, storage_path, filename, content_type: string|null, created_by, created_at}`
  - `Place {id, trip_id, stop_id: string|null, name, lat, lng, note: string|null, source: 'manual'|'claude', status: 'active'|'suggested'|'dismissed', wishlist_item_id: string|null, created_by, created_at}`
  - `WishlistItem {id, trip_id, text, note: string|null, status: 'unchecked'|'covered'|'not_covered', check_note: string|null, covered_by_stop_id: string|null, checked_at: string|null, created_by, created_at}`
  - `Profile {id, display_name}`
- Produces, in `dates.ts`: `addDays(d: ISODate, n: number): ISODate`, `diffDays(a: ISODate, b: ISODate): number` (a − b), `formatDay(d): string` → `'17 Apr'`, `formatDayLong(d): string` → `'17 June'`, `formatRange(from: ISODate, to: ISODate): string` → `'17–22 Apr'` (same month) or `'29 Apr–2 May'`.

- [ ] **Step 1: Write the failing tests** in `dates.test.ts`:
  - `addDays('2027-04-30', 1) === '2027-05-01'`, `addDays('2027-06-17', -61) === '2027-04-17'`, `addDays('2027-12-31', 1) === '2028-01-01'`
  - `diffDays('2027-06-17', '2027-04-17') === 61`
  - `formatDay('2027-04-17') === '17 Apr'`, `formatDayLong('2027-06-17') === '17 June'`
  - `formatRange('2027-04-17', '2027-04-22') === '17–22 Apr'`, `formatRange('2027-04-29', '2027-05-02') === '29 Apr–2 May'`
- [ ] **Step 2:** Run `npm test`. Expected: FAIL (module not found).
- [ ] **Step 3:** Write `types.ts` and implement `dates.ts` using `Date.UTC` and `getUTC*`, with English month names hard-coded (no `toLocaleDateString`, whose output depends on the machine).
- [ ] **Step 4:** Run `npm test`, then `TZ=Asia/Shanghai npm test`, then `TZ=America/Los_Angeles npm test`. Expected: all PASS each time.
- [ ] **Step 5:** Commit: `feat: domain types and UTC date utilities`.

### Task 3: Route builder

**Files:**
- Create: `src/domain/route.ts`, `src/domain/fixtures.ts` (test fixture builders, reused in Tasks 4, 5 and 12)
- Test: `src/domain/route.test.ts`

**Interfaces:**
- Consumes: types and `addDays`/`diffDays` (Task 2).
- Produces:
  - `legKey(fromId: string|null, toId: string|null): string` → `` `${fromId ?? 'home'}->${toId ?? 'home'}` ``
  - `RouteStop {stop: Stop, index: number, nights: number /* clamped */, start: ISODate, end: ISODate, nightDates: ISODate[]}`
  - `RouteLeg {key: string, kind: 'inbound'|'internal'|'outbound', from: Stop|null, to: Stop|null, row: Leg|null, date: ISODate, mode: Mode, overnight: boolean}`
  - `Route {trip: Trip, stops: RouteStop[], legs: RouteLeg[], totalNights: number, plannedNights: number, unplannedNights: number /* negative = overrun */, orphanLegs: Leg[]}`
  - `buildRoute(trip: Trip, stops: Stop[], legs: Leg[]): Route`
  - `fixtures.ts`: `makeTrip(over?)`, `makeStop(over)`, `makeLeg(over)`, `makeReservation(over)` with sensible defaults (trip `2027-04-17`–`2027-06-17`, `home_label 'Amsterdam'`).

Rules (from spec "Dates"):
- Sort stops by `position`, then `created_at`. Nights = `Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0`.
- The first stop's `start` = `trip.start_date`. `end = start + nights`. `nightDates = [start … end−1]`.
- An internal leg's date = `from.end`. If the leg row is `overnight`, the next stop starts `from.end + 1`; otherwise `from.end`.
- Inbound leg: `kind 'inbound'`, key `legKey(null, first.id)`, date = `trip.start_date`. Outbound: key `legKey(last.id, null)`, date = `last.end`. Both are always `overnight: false` (the row flag is ignored).
- Default mode when there's no row: `'flight'` for inbound/outbound, `'train'` for internal.
- `legs` lists inbound, internals in order, then outbound. It's `[]` when there are no stops.
- `plannedNights` = Σ clamped nights + count of internal overnight legs. `totalNights = diffDays(end_date, start_date)`.
- `orphanLegs` = rows whose key isn't in the current `legs`.

- [ ] **Step 1: Write the failing tests.** Standard fixture: Beijing (5 nights, position 1), Xi'an (3, position 2), Chengdu (4, position 3); leg row Xi'an→Chengdu `overnight: true`.
  - Beijing `start '2027-04-17'`, `end '2027-04-22'`, 5 `nightDates`. Xi'an `'2027-04-22'`→`'2027-04-25'`. Chengdu `'2027-04-26'`→`'2027-04-30'`.
  - Leg dates: inbound `'2027-04-17'`, Beijing→Xi'an `'2027-04-22'`, Xi'an→Chengdu `'2027-04-25'` (overnight), outbound `'2027-04-30'`. Modes: `flight, train, train, flight`.
  - `plannedNights === 13`, `unplannedNights === 48`, `totalNights === 61`.
  - Empty trip: `legs` is `[]`, `stops` is `[]`, `unplannedNights === 61`.
  - Bad nights: `nights: -2`, `2.7` and `NaN` become `0`, `2` and `0`; no exception.
  - Duplicate positions: two stops at `position 2` sort by `created_at`.
  - A 0-night stop: `start === end`, `nightDates` is `[]`.
  - A leg row Beijing→Chengdu (not adjacent) appears in `orphanLegs`.
  - An `overnight: true` row on the inbound leg doesn't change Beijing's start or `plannedNights`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `buildRoute` and `legKey` in `route.ts`, plus the fixture builders.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: derive route dates, legs and planned nights`.

### Task 4: To-do derivation

**Files:**
- Create: `src/domain/todos.ts`
- Test: `src/domain/todos.test.ts`

**Interfaces:**
- Consumes: `Route`, `RouteLeg`, `buildRoute`, fixtures, date formatters.
- Produces: `TodoKind = 'unplanned'|'overrun'|'book-leg'|'leg-date'|'book-hotel'|'hotel-dates'|'orphan-leg'`; `Todo {id: string /* stable, e.g. 'book-hotel:<stopId>:<from>' */, kind, text: string, stopId?: string, legKey?: string}`; `deriveTodos(route: Route, reservations: Reservation[]): Todo[]`.

Rules and order: the unplanned/overrun item first, then walk the route in order (inbound leg, stop 1 hotel items, leg, stop 2 …, outbound), then orphans last.
- Place name: `stop.name`, or `trip.home_label` for null ends.
- Mode word: `train`, `flight` and `bus` as is; `car` and `other` become `transport`. Capitalise it in `leg-date` texts.
- A leg's reservations are those with `leg_id === row?.id` and `kind 'transport'`. `book-leg` fires when there are none and `row?.no_booking_needed` isn't true.
- `leg-date` compares `start_date` with `leg.date`. For the inbound leg it compares `end_date ?? start_date`.
- Hotels: reservations with `stop_id === stop.id`, `kind 'hotel'`. A hotel covers nights `[start_date, end_date)`; a missing `end_date` means one night. Uncovered `nightDates`, grouped into consecutive runs, give one `book-hotel` each, as `formatRange(runStart, runEnd + 1)`. None fire if `stop.no_booking_needed`.
- `hotel-dates` fires when `start_date < stop.start || end_date > stop.end`.
- `orphan-leg` fires for each orphan row that has ≥1 reservation (of any kind) with `leg_id === row.id`.
- Singular "1 night", plural "N nights".

- [ ] **Step 1: Write the failing tests.** Use the Task 3 standard fixture with no reservations. Expect exactly these texts, in order:
  1. `48 nights still unplanned before 17 June`
  2. `Book flight Amsterdam → Beijing, 17 Apr`
  3. `Book hotel in Beijing, 17–22 Apr`
  4. `Book train Beijing → Xi'an, 22 Apr`
  5. `Book hotel in Xi'an, 22–25 Apr`
  6. `Book train Xi'an → Chengdu, 25 Apr`
  7. `Book hotel in Chengdu, 26–30 Apr`
  8. `Book flight Chengdu → Amsterdam, 30 Apr`

  Plus these variations:
  - Hotel Beijing `2027-04-17`→`2027-04-20`: the Beijing item becomes `Book hotel in Beijing, 20–22 Apr`.
  - Hotel Beijing `2027-04-15`→`2027-04-20`: includes `Hotel in Beijing booked 15–20 Apr, stay is now 17–22 Apr` and `Book hotel in Beijing, 20–22 Apr`.
  - Transport on the Beijing→Xi'an row with `start_date '2027-04-23'`: `Train Beijing → Xi'an is booked for 23 Apr, but the plan says 22 Apr`, and no `Book train Beijing → Xi'an`.
  - Inbound transport `start_date '2027-04-16'`, `end_date '2027-04-17'`: no inbound item at all.
  - Beijing `no_booking_needed`: no Beijing hotel item. Beijing→Xi'an row `no_booking_needed`: no item for that leg.
  - Nights 30/20/14 with no overnight legs: the first item is `Plan runs 3 nights past 17 June`. With a total of 60: `1 night still unplanned before 17 June`.
  - Orphan row Beijing→Chengdu with a reservation: the last item is `Booking Beijing → Chengdu no longer matches the route`.
  - Empty trip: exactly `['61 nights still unplanned before 17 June']`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `deriveTodos`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: derive to-dos from route gaps and reservations`.

### Task 5: Distance, travel time, timelapse position

**Files:**
- Create: `src/domain/geo.ts`, `src/domain/timelapse.ts`
- Test: `src/domain/geo.test.ts`, `src/domain/timelapse.test.ts`

**Interfaces:**
- Produces:
  - `haversineKm(a: {lat:number,lng:number}, b: {lat:number,lng:number}): number`
  - `estimateHours(km: number, mode: Mode): number` with speeds train `km/160`, flight `km/600 + 2`, bus `km/60`, car `km/70`, other `km/60`
  - `formatHours(h: number): string` → `'45m'`, `'5h'`, `'14h 30m'` (rounded to 15 min)
  - `tripDays(route: Route): ISODate[]` (start…end inclusive, 62 entries)
  - `DayPosition = {kind:'stop', stopId:string} | {kind:'leg', legKey:string} | {kind:'unplanned'}`
  - `locateDay(route: Route, date: ISODate): DayPosition`, with priority: a 0-night stop on that date → stop; then any leg whose `date === date` → leg; then a stop with `start <= date < end` → stop; else unplanned

- [ ] **Step 1: Write the failing tests.**
  - Beijing (39.9042, 116.4074) → Xi'an (34.3416, 108.9398): km between 900 and 930.
  - `estimateHours(800, 'train') === 5`, `estimateHours(1200, 'flight') === 4`.
  - `formatHours(0.75) === '45m'`, `formatHours(14.5) === '14h 30m'`.
  - Standard fixture: `tripDays(route).length === 62`. `locateDay` gives:
    - `'2027-04-17'` → inbound leg
    - `'2027-04-18'` → Beijing
    - `'2027-04-22'` → Beijing→Xi'an leg
    - `'2027-04-23'` → Xi'an
    - `'2027-04-25'` → Xi'an→Chengdu leg
    - `'2027-04-26'` → Chengdu
    - `'2027-04-30'` → outbound leg
    - `'2027-05-01'` → unplanned
  - Empty trip: every day is unplanned.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement both modules.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: distance, travel time and timelapse day lookup`.

### Task 6: Supabase schema, access rules, access test

**This task has two checkpoints where Daan acts in their own terminal or the dashboard. Stop and ask; never handle their password or token.**

**Files:**
- Create: `supabase/config.toml` (via `npx supabase init`), `supabase/migrations/<timestamp>_init.sql`, `scripts/check-access.ts`, `.env.production`, `.env.claude` (local only, never committed)

**Interfaces:**
- Produces: the DB tables matching `types.ts` exactly (column names and nullability), one seeded `trip` row, the private storage bucket `attachments`, and the env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (in `.env.production`, committed; both public by design). `.env.claude` holds `CLAUDE_EMAIL` and `CLAUDE_PASSWORD`.

Schema (one migration):
- `trip`: seed `('China 2027', '2027-04-17', '2027-06-17', 'Home')`.
- `stops`, `legs`, `reservations`, `attachments`, `places`, `wishlist_items`, `profiles`, with columns per `types.ts`. Ids are `uuid default gen_random_uuid()`, `created_at timestamptz default now()`, `created_by uuid default auth.uid() references auth.users on delete set null`.
- `legs`: `unique nulls not distinct (from_stop_id, to_stop_id)`. Both stop FKs `on delete cascade`.
- `reservations`: `check ((stop_id is null) <> (leg_id is null))`. `stop_id`/`leg_id` FKs `on delete cascade`. `attachments.reservation_id` `on delete cascade`.
- `places.stop_id`, `places.wishlist_item_id` and `wishlist_items.covered_by_stop_id` are all `on delete set null`.
- `profiles`: `id uuid primary key references auth.users on delete cascade`, `display_name text not null`.
- Enums as `text` with `check (… in (…))`.
- RLS enabled on every table. One policy per table, `for all to authenticated using (true) with check (true)`, except `profiles`: select for authenticated, insert/update only `id = auth.uid()`. `grant select, insert, update, delete on all tables in schema public to authenticated`; revoke all from `anon`.
- Storage: `insert into storage.buckets (id, name, public, file_size_limit) values ('attachments','attachments', false, 52428800)`. Add policies on `storage.objects` for authenticated select/insert/delete where `bucket_id = 'attachments'`.
- `alter publication supabase_realtime add table trip, stops, legs, reservations, attachments, places, wishlist_items, profiles`.

- [ ] **Step 1:** Run `npx supabase init`. Write the migration.
- [ ] **Step 2: Checkpoint (Daan).** Ask Daan to run `npx supabase link --project-ref rbfdovrgylrvhwahyusz` in their terminal; it prompts for the database password. Then run `npx supabase db push` yourself. If it prompts for the password, ask Daan to run it instead. Expected: the migration is applied.
- [ ] **Step 3:** Fetch the URL and anon/publishable key, never the service key: `npx supabase projects api-keys --project-ref rbfdovrgylrvhwahyusz -o json`, piped through a filter that prints only the anon/publishable entry. Write `.env.production` with `VITE_SUPABASE_URL=https://rbfdovrgylrvhwahyusz.supabase.co` and the key.
- [ ] **Step 4: Checkpoint (Daan), in the dashboard:**
  - Authentication → Sign In / Providers: turn **off** "Allow new users to sign up".
  - Authentication → Users → Add user (auto-confirm) three times: Daan, Cynthia, and `claude@china-trip.invalid`.
  - Write `CLAUDE_EMAIL` and `CLAUDE_PASSWORD` into `.env.claude` themselves.
- [ ] **Step 5:** Write `scripts/check-access.ts`. It loads `.env.production` and `.env.claude` and checks, printing PASS/FAIL per check and exiting non-zero on any FAIL:
  - (a) anon `select` on each table returns 0 rows or an error
  - (b) anon `insert` into `stops` errors
  - (c) anon `storage.from('attachments').list()` returns nothing
  - (d) `auth.signUp` with a random email errors
  - (e) signed in as Claude, `select` from `trip` returns 1 row
- [ ] **Step 6:** Run `npm run check-access`. Expected: all PASS.
- [ ] **Step 7:** Commit `supabase/`, `scripts/check-access.ts`, `.env.production`: `feat: Supabase schema with RLS, storage and access test`. Check `git status` first: `.env.claude` must not be staged.

### Task 7: Data layer and login

**Files:**
- Create: `src/lib/supabase.ts`, `src/auth/useSession.ts`, `src/auth/Login.tsx`, `src/auth/NamePrompt.tsx`, `src/data/TripDataProvider.tsx`, `src/data/actions.ts`, `src/ui/App.tsx`, `src/ui/styles.css`

**Interfaces:**
- Consumes: types, `buildRoute`, `deriveTodos`.
- Produces:
  - `supabase` (client with `persistSession: true`)
  - `useSession(): {session: Session|null, loading: boolean}`
  - `TripData {trip, stops, legs, reservations, attachments, places, wishlist, profiles}`
  - `useTrip(): {data: TripData|null, route: Route|null, todos: Todo[], loading: boolean, error: string|null, refresh(): Promise<void>, nameOf(userId: string|null): string}`
  - `actions.ts`, each `async` and throwing on Supabase error, with `tripId` taken from the loaded trip:
    - `addStop(input: {name, name_zh?, lat, lng, nights?}): Promise<Stop>` appends at `max(position)+1`, with nights defaulting to 1
    - `updateStop(id, patch: Partial<Stop>)`
    - `deleteStop(id)`
    - `moveStop(stops: Stop[], id, dir: -1|1)` renumbers every stop `1..n` in the new order
    - `upsertLeg(fromId: string|null, toId: string|null, patch: Partial<Leg>): Promise<Leg>`
    - `addReservation(target: {stop_id}|{leg_id}, input): Promise<Reservation>`, `updateReservation(id, patch)`, `deleteReservation(r: Reservation, files: Attachment[])` (removes storage objects first)
    - `uploadAttachment(reservationId, file: File): Promise<Attachment>` (path `${reservationId}/${crypto.randomUUID()}-${file.name}`), `openAttachment(a): Promise<string>` (signed URL, 3600 s), `deleteAttachment(a)`
    - `addPlace(input: {name, lat, lng, note?, stop_id: string|null})`, `updatePlace(id, patch)`
    - `ideaToStop(place: Place): Promise<Stop>` (`addStop`, then the place gets `stop_id` = the new stop and `status 'active'`)
    - `addWish(text)`, `updateWish(id, patch)`, `deleteWish(id)`
    - `saveMyName(name)` (upserts `profiles` for `auth.uid()`)

- [ ] **Step 1:** Implement the client, `useSession`, and `Login` (email + password form, error text "Wrong email or password", plus a sign-out button in the app header).
- [ ] **Step 2:** Implement `TripDataProvider`. On mount it loads all eight tables in parallel. It subscribes to one Realtime channel listening to `postgres_changes` `*` on the public schema, and calls `refresh()` debounced at 300 ms. Every action calls `refresh()` after it succeeds. `route` and `todos` come from `useMemo`.
- [ ] **Step 3:** Implement `NamePrompt`: if the signed-in user has no profile row, ask "What should we call you?" and call `saveMyName`.
- [ ] **Step 4:** Implement `actions.ts`.
- [ ] **Step 5:** Write a skeleton `App.tsx`: header, a map area placeholder, a side panel placeholder and a bottom bar placeholder, plus a CSS grid layout using system fonts and CSS variables.
- [ ] **Step 6: Verify.** Run `npm run build` (expected: success) and `npm run dev`, then sign in as the Claude account. Expected: the name prompt appears, saving a name shows the app shell, and a reload stays signed in.
- [ ] **Step 7:** Commit: `feat: auth, trip data provider with realtime refresh, mutations`.

### Task 8: Map, stops and legs

**Files:**
- Create: `src/lib/photon.ts`, `src/ui/map/TripMap.tsx`, `src/ui/panels/StopsPanel.tsx`, `src/ui/panels/StopSearch.tsx`, `src/ui/panels/LegDetail.tsx`, `src/ui/panels/StopDetail.tsx` (basic fields only; reservations come in Task 9)

**Interfaces:**
- Consumes: `useTrip`, actions, `haversineKm`, `estimateHours`, `formatHours`, `formatRange`.
- Produces:
  - `searchPlaces(q: string): Promise<{name: string, lat: number, lng: number, label: string}[]>` and `reverseGeocode(lat, lng): Promise<string|null>`
  - `Selection = {kind:'stop', id: string} | {kind:'leg', key: string} | {kind:'place', id: string} | null` (state in `App`)
  - `MapMode = 'add-stop' | 'add-idea' | null`
  - `TripMap` props: `{route, places, selection, onSelect, mapMode, onMapClick(lat, lng), marker?: {lat, lng} | null}`

- [ ] **Step 1:** Implement `photon.ts`. Map Photon features to `name`/`label` (`name, city/state, country`).
- [ ] **Step 2:** Build `TripMap`:
  - centre `[35, 104]`, zoom 4
  - CARTO Voyager raster tiles (`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`) with OSM and CARTO attribution
  - numbered stop `CircleMarker`s and a route `Polyline` through the stops in order
  - legs drawn dashed when overnight
  - clickable stops and leg segments that set `selection`
- [ ] **Step 3: Verify the labels.** Run `npm run dev`. At zoom 5 over Beijing, check whether the city labels show in Latin script. If they're Chinese-only, try `voyager_labels_under`, then OSM standard. Note the result in a code comment.
- [ ] **Step 4:** Build `StopsPanel`:
  - ordered list showing `formatRange(start, end)` and a nights input (integer, min 0)
  - ↑/↓ buttons calling `moveStop`
  - "Add stop", which opens `StopSearch` (results list; pick one to call `addStop`) with a "Click on map instead" toggle setting `mapMode 'add-stop'`. A map click calls `reverseGeocode` to prefill an editable name, then `addStop`.
  - between stops, a leg row: mode icon, `~{km} km · {formatHours}` (`manual_hours` if set), "overnight" badge; a click selects the leg
- [ ] **Step 5:** Build `LegDetail`:
  - mode select, overnight checkbox, "no booking needed" checkbox with a note, manual hours input
  - each change calls `upsertLeg(from, to, patch)`
- [ ] **Step 6:** Build `StopDetail` (basic):
  - name, Chinese name, notes, "no booking needed" with a note
  - delete: when the stop has reservations, confirm "Delete {name} and its {n} reservations?", otherwise "Delete {name}?"
- [ ] **Step 7: Verify (manual, signed in).**
  - Add Beijing, Xi'an and Chengdu by search, and one stop by map click. The dates follow from 17 Apr.
  - Mark Xi'an→Chengdu as overnight: Chengdu starts a day later.
  - Reorder with the arrows: the dates recompute.
  - In a second browser window signed in as another account, the change appears within about 1 s.
  - Delete a stop: the confirm dialog appears.
- [ ] **Step 8:** Commit: `feat: map with route, stop list, stop search and leg editing`.

### Task 9: Reservations and attachments

**Files:**
- Create: `src/ui/panels/Reservations.tsx`, `src/ui/panels/ReservationForm.tsx`, `src/ui/panels/Attachments.tsx`
- Modify: `StopDetail.tsx`, `LegDetail.tsx` (render `<Reservations target=… />`)

**Interfaces:**
- Consumes: reservation and attachment actions.
- Produces: `<Reservations target={{stop_id}|{leg_id}} defaultKind="hotel"|"transport" />`. For a leg with no row yet, it first calls `upsertLeg(from, to, {})` to get a `leg_id`.

- [ ] **Step 1:** Build `ReservationForm`. Fields: kind, title, confirmation, start date/time, end date/time, address, address (Chinese), details. Labels depend on kind: hotel shows "Check-in"/"Check-out"; transport shows "Departs"/"Arrives". For hotels, the dates prefill from the stop's dates; for transport, from the leg date.
- [ ] **Step 2:** Build the `Reservations` list: cards showing the title, dates, confirmation and "added by {nameOf}", with edit and delete.
- [ ] **Step 3:** Build `Attachments`, inside each reservation card:
  - a file input (`accept` images and `application/pdf`)
  - a list of files that open through the signed URL in a new tab, and a delete button
  - on upload failure, show the error message (e.g. a file over 50 MB)
- [ ] **Step 4: Verify (manual).**
  - Add a hotel to Beijing covering only part of the stay: the to-do panel (Task 10) isn't there yet, so check `useTrip().todos` with a temporary `console.log`, then remove it.
  - Upload a PDF and a phone photo, then open both.
  - Delete the reservation: its files disappear from the bucket (check in the dashboard).
- [ ] **Step 5:** Commit: `feat: reservations with file attachments on stops and legs`.

### Task 10: To-dos, wishlist, places and idea pins

**Files:**
- Create: `src/ui/panels/TodoPanel.tsx`, `src/ui/panels/WishlistPanel.tsx`, `src/ui/panels/PlaceDetail.tsx`
- Modify: `TripMap.tsx` (place markers), `StopDetail.tsx` (the stop's places list with "Add place"), `App.tsx` (side panel tabs: Route / To do (count) / Wishlist)

**Interfaces:**
- Consumes: `todos`, place and wish actions, `ideaToStop`.

- [ ] **Step 1:** Build `TodoPanel`: a list of `todo.text`; clicking an item with `stopId`/`legKey` sets `selection`. When the list is empty, show "Nothing left to book."
- [ ] **Step 2:** Add place markers to `TripMap`:
  - active places on a stop: small solid dots
  - idea pins (`stop_id null`, status active): faded dots
  - suggestions (`status 'suggested'`): dashed outline with a "suggested" tooltip
  - dismissed places: hidden
- [ ] **Step 3:** Build `PlaceDetail`:
  - name and note, plus "Suggested by Claude" for `source 'claude'`, and the linked wishlist text if any
  - for idea pins and suggestions: buttons "Add as new stop" (`ideaToStop`), "Attach to stop…" (select; `updatePlace(id, {stop_id, status:'active'})`) and "Dismiss" (`status 'dismissed'`)
  - for a suggestion already on a stop: "Keep" (`status 'active'`) and "Dismiss"
- [ ] **Step 4:** Add idea pins by map click (`mapMode 'add-idea'`, name prefilled by `reverseGeocode`) or by search. Add places to a stop from `StopDetail`, using search biased by the stop's coordinates (`&lat=&lon=`).
- [ ] **Step 5:** Build `WishlistPanel`:
  - add, edit and delete items
  - a status chip: "Not checked yet" / "Covered: {check_note}" / "Not covered: {check_note}"
  - a list of suggestions linked to each item
- [ ] **Step 6: Verify (manual).**
  - The to-do list matches the route; clicking an item selects the stop or leg.
  - Add an idea pin, then use "Add as new stop": it's appended to the route and the pin shows as an active place.
  - Dismiss a pin: it disappears.
  - Delete a stop that has a place: the place shows up as an idea pin.
- [ ] **Step 7:** Commit: `feat: to-do panel, wishlist, places and idea pins`.

### Task 11: Timelapse

**Files:**
- Create: `src/ui/Timelapse.tsx`
- Modify: `App.tsx`, `TripMap.tsx` (a `travelled` polyline and the `marker` prop)

**Interfaces:**
- Consumes: `tripDays`, `locateDay`, `formatDay`.
- Produces: `Timelapse` props `{route, onPosition(p: {lat, lng} | null, dayIndex: number)}`.

- [ ] **Step 1:** Build the bottom bar: ◀ / ▶(play-pause) / ▶ buttons, a range slider over `tripDays` (0–61), and the label `Day {i+1} · {formatDay} · {stop name | "Travelling {from} → {to}" | "Unplanned"}`.
- [ ] **Step 2: Playback.** Advance one day every 700 ms. On a leg day, interpolate the marker from `from` to `to` over that 700 ms using `requestAnimationFrame`, with `home` ends treated as the stop end itself (no home coordinates). When paused on a leg day, the marker sits at the midpoint. On an unplanned day, the marker hides.
- [ ] **Step 3:** In `TripMap`, draw the full route faint and the travelled part (through the marker) bold. Pan only when the marker leaves the view.
- [ ] **Step 4: Verify (manual).** Play the standard three-stop route: the marker sits in Beijing on days 2–5, moves along the leg on 22 Apr, and is on the dashed overnight leg on 25 Apr. The days after the route say "Unplanned". The empty trip plays without errors.
- [ ] **Step 5:** Commit: `feat: timelapse playback over the trip days`.

### Task 12: Claude check script

**Files:**
- Create: `src/domain/checkApply.ts`, `scripts/trip-check.ts`, `CLAUDE.md`
- Test: `src/domain/checkApply.test.ts`

**Interfaces:**
- Consumes: `buildRoute`, types, fixtures.
- Produces:
  - `CheckResult {wishlist: {id: string, status: 'covered'|'not_covered', check_note: string, covered_by_stop_id: string|null}[], suggestions: {name: string, lat: number, lng: number, note: string, stop_id: string|null, wishlist_item_id: string|null}[]}`
  - `planCheckWrites(result: CheckResult, existing: {wishlist: WishlistItem[], stops: Stop[], places: Place[]}): {wishlistUpdates: (Pick<WishlistItem,'id'|'status'|'check_note'|'covered_by_stop_id'> & {checked_at: string})[], placeInserts: Omit<Place,'id'|'trip_id'|'created_by'|'created_at'>[], skipped: string[]}`
  - CLI: `npx tsx scripts/trip-check.ts export` prints JSON `{trip, route: {stops: [{id, name, start, end, nights}], legs: [{key, from, to, date, mode, overnight}]}, places, wishlist}` to stdout. `npx tsx scripts/trip-check.ts apply <file.json>` validates the file with `planCheckWrites` and writes the result, printing a summary and the skipped items.

- [ ] **Step 1: Write the failing tests.**
  - A wishlist entry with an unknown id is skipped (reason contains the id).
  - A suggestion with an unknown `stop_id` is skipped.
  - A suggestion named `"Jinli Street"` when a place `"jinli street"` already exists (any status, including `dismissed`) is skipped, so dismissed suggestions don't come back.
  - A valid suggestion inserts with `source: 'claude'`, `status: 'suggested'`, and `stop_id: null` stays an idea pin.
  - No output field targets stops, legs or reservations.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `planCheckWrites`, then `trip-check.ts`. The script signs in with `.env.claude` and does a single read of all tables for `export`. For `apply`, it issues only `update` on `wishlist_items` and `insert` on `places`, and sets Claude's profile name to "Claude" if it's missing.
- [ ] **Step 4:** Run `npm test` (expected: PASS). Then run `npx tsx scripts/trip-check.ts export` against the real project. Expected: valid JSON with the stops added during manual testing.
- [ ] **Step 5:** Write `CLAUDE.md`, short:
  - how to run the wishlist check: export, reason about the wishlist against the route, write `check.json` to the scratchpad, apply
  - the rule that the check never changes stops, legs or reservations
  - how to run `npm run check-access`
  - how to deploy (Task 13), and the git identity and push rules from Global Constraints
- [ ] **Step 6:** Commit: `feat: Claude wishlist check script (export/apply)`.

### Task 13: Deploy to GitHub Pages

**Outward-facing: confirm with Daan before creating the public repo.**

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1:** Write the workflow:
  - on push to `main`: `actions/checkout`, `actions/setup-node` (Node 22, npm cache), `npm ci`, `npm test`, `npm run build`
  - `actions/configure-pages`, `actions/upload-pages-artifact` (`dist`), `actions/deploy-pages`
  - permissions `pages: write`, `id-token: write`
  - `.env.production` is committed, so the build needs no secrets
- [ ] **Step 2:** Check that `gh auth status` shows DaanArt as active, then run:
  - `gh repo create DaanArt/china-trip --public --source . --remote origin`
  - `gh api -X POST repos/DaanArt/china-trip/pages -f build_type=workflow`
- [ ] **Step 3:** Push with the gh credential helper (Global Constraints). Watch the run with `gh run watch`. Expected: success.
- [ ] **Step 4: Verify.**
  - Open `https://daanart.github.io/china-trip/`: the login works, the data loads, a tile request goes to CARTO, and the network tab shows no Google requests.
  - `npm run check-access` still passes.
  - Send Daan the URL and Cynthia's login steps (Daan shares her password themselves).
- [ ] **Step 5:** Commit any fixes. Update the spec's "Status" section to "v1 live at …", then commit and push.
