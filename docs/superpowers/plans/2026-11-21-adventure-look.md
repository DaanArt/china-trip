# Adventure-Map Look Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the live planner in the "mockup B" adventure-map look (built-in low-detail China map, chunky outlined UI), with e2e moved to a local Supabase so the live trip is never touched.

**Architecture:** The map drops tile layers: a generated, simplified GeoJSON of China and the land around it (`src/ui/map/world.ts`) is drawn by Leaflet on a CSS "sea". Pins are SVG `DivIcon`s. The app CSS becomes one light theme with a bundled Fredoka font. Playwright runs the dev server in `test` mode against `npx supabase start`.

**Tech Stack:** Leaflet/react-leaflet (existing), mapshaper (dev script), @fontsource/fredoka, Supabase CLI local stack (Docker), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-21-minimal-map-design.md`

## Global Constraints

- Never write to the live Supabase project from tests. e2e must refuse any Supabase URL that isn't `127.0.0.1`/`localhost`.
- Local stack keys (from `npx supabase status`) are local-only defaults. They go in `.env.test` (gitignored), never in `.env`.
- No Google, no tile servers: the map makes zero tile requests.
- Every existing accessible name stays the same, so the current e2e suite passes unchanged.
- Palette: cream `#fbf1d6`, sea `#7fc4dd`, ink `#2f2f2f`, red `#e8343f`, beige `#e6d6b0`, yellow `#ffd23f`. Font: Fredoka (self-hosted via @fontsource), system fallback.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push with the gh credential helper (see CLAUDE.md).

## Review Focus

1. **Real data on the live trip:** e2e must never run against it. Pinned by the global-setup URL guard (Task 1).
2. **Existing stops far from the mainland outline** (e.g. Hong Kong islands, Hainan): pins still render even where the simplified coastline is off. Checked visually in Task 4.
3. **Readability:** cream-on-cream and red text must stay at least 4.5:1. Checked in Task 4's screenshot review.

---

### Task 1: Local Supabase for e2e

**Files:** `playwright.config.ts`, `e2e/helpers.ts`, `e2e/global-setup.ts`, `.env.test` (gitignored), `scripts/e2e-setup.ts`, `.gitignore`, `CLAUDE.md`

- [ ] Write a failing guard check: with `.env.test` pointing at the live URL, `npx playwright test` must refuse with "e2e only runs against a local Supabase".
- [ ] `npx supabase start`. Write `.env.test` from `npx supabase status -o env`, filtered to `VITE_SUPABASE_URL` (API URL) and `VITE_SUPABASE_ANON_KEY` (anon key). The local service key goes to `.env.test` as `SUPABASE_LOCAL_SERVICE_KEY` (local default, used only by the setup script).
- [ ] `scripts/e2e-setup.ts`: creates the confirmed local test user `claude@china-trip.invalid` with a fixed local password, via the local admin API. Idempotent.
- [ ] Playwright `webServer`: `npx vite --mode test --port 5199 --strictPort`. Helpers load `.env.test` and use the local test user. `global-setup.ts` refuses non-local URLs, then runs the user setup.
- [ ] Run the full e2e suite locally. Expected: all pass. Commit.

### Task 2: Generated world shapes

**Files:** `scripts/build-world.sh`, `src/ui/map/world.ts`, test `src/ui/map/world.test.ts`

- [ ] Test: `world.china` and `world.land` are GeoJSON FeatureCollections. The China bbox is within lng 73–136 / lat 17–54. The serialized size is under 15 KB.
- [ ] `build-world.sh`: download Natural Earth 50m admin-0 to a temp dir, then use mapshaper to produce China (simplify 3%, keep-shapes, islands under 3000 km² dropped) and the land in bbox 55,0,155,60 without China (dissolved, same simplification). Write `world.ts` with both as typed constants and a source/licence comment.
- [ ] Run it, run the tests, commit.

### Task 3: Map restyle

**Files:** `src/ui/map/TripMap.tsx`, `src/ui/map/pins.ts`, `src/ui/styles.css`, e2e `e2e/stops.e2e.ts`

- [ ] e2e first:
  - The map makes no requests to any tile or Google host.
  - `path.china-shape` exists.
  - A stop renders `.stop-pin` showing its number, with a visible label containing its name.
  - An idea pin renders `.pin-idea`.
  - Replace the old "OpenStreetMap tiles" test.
- [ ] `pins.ts`:
  - `stopPin(n: number, selected: boolean): L.DivIcon`
  - `placePin(kind: 'active' | 'idea' | 'suggested', selected: boolean): L.DivIcon`
  - SVG as in the mockup.
- [ ] `TripMap`:
  - remove `TileLayer`; render `GeoJSON` land (`land-shape`) and China (`china-shape`)
  - `Marker`s with pin icons and permanent stop labels; places show their name as a hover tooltip
  - dotted route, a longer dash for overnight legs, a selected leg thicker in red
  - timelapse marker yellow; travelled path solid ink
  - `minZoom` 3.5, `maxZoom` 8, `maxBounds` around the land bbox
  - attribution "Map data: Natural Earth"
- [ ] Run all e2e and unit tests. Commit.

### Task 4: App theme

**Files:** `src/ui/styles.css`, `src/main.tsx`, `package.json`

- [ ] e2e first: the page uses the Fredoka font (`document.fonts.check('16px Fredoka')` after load), and no request goes to fonts.googleapis.com.
- [ ] `npm i @fontsource/fredoka`; import weights 400/600/700 in `main.tsx`.
- [ ] Rewrite the CSS tokens to the palette and drop the dark-mode block:
  - panels: cream with 2–3 px ink outline and a hard offset shadow
  - buttons: chunky, red primary; pressed state shrinks the shadow
  - tabs: folder-style
  - to-dos: quest cards (red for problems, yellow for unplanned/overrun)
  - inputs: outlined cream
  - login: on the blue grid
  - focus rings visible
- [ ] Screenshots (local stack with sample stops): login, route, stop detail, to-do, wishlist. Review contrast and the Review Focus items, then fix.
- [ ] Run all tests. Commit.

### Task 5: Deploy

- [ ] Merge into `main`, push, watch the Pages run, then check the live site (signed in as the live Claude account, read-only):
  - the map draws
  - no tile, font-CDN or Google requests
  - real stops show as pins
- [ ] Run `npm run check-access`.
