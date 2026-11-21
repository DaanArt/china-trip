# China Trip Planner — Design

Date: 2026-11-21 · Owner: Daan · Users: Daan and Cynthia

## Intent

Daan and Cynthia are travelling through China from **17 April to 17 June 2027** (61 nights). They have no plan yet. They want one shared place to design the trip from scratch, with a map of China at its centre: put stops on the map, see the route play out day by day ("timelapse") to check it's physically doable, and have the app tell them what still needs booking.

Most of the value is **before** the trip, in designing it together. During the trip the app is a reference (where's tonight's hotel, what's its address, what did we want to do here). Version 1 is built for the planning phase; trip-time features come in a later version before departure.

A second idea: a shared **wishlist** of things they want the trip to include. When Daan works on the app with Claude Code, they can ask Claude to run a **check**: compare the wishlist with the plan, mark what's covered, and add recommendations that aren't in the plan yet. The AI lives in those Claude Code sessions, not in the app.

## Goals (version 1)

1. A map of China where they add **stops** (a city or place) and set **nights** per stop. Stops are ordered; dates follow automatically from 17 April, so changing one stop shifts everything after it.
2. **Legs** between consecutive stops, with a transport mode and an estimated distance and travel time. Also an inbound leg (home → first stop, arriving 17 April) and an outbound leg (last stop → home, 17 June).
3. **Reservations** attached to a stop (hotel, activity) or to a leg (train, flight, bus), with structured fields and **file attachments** (confirmation PDFs, e-tickets, screenshots).
4. **Generated to-dos**: the app derives what's missing from the plan. Nobody ticks to-dos by hand; adding the right reservation resolves them. (Rules below.)
5. **Timelapse**: a day slider plus play button over the 61 days. The route draws itself on the map, and a marker shows where they are on each day (moving along the leg on travel days). A panel shows the day number, the date and the location.
6. **Places**: smaller pins attached to a stop ("fun things in the neighbourhood"), added by hand or suggested by the Claude check. **Idea pins** are places not (yet) on the route: shown faded on the map, added by either user or suggested by the check. From an idea pin you can **add it as a new stop**, **attach it to an existing stop**, or **dismiss** it. This supports the early "where shall we go?" phase, when there are few stops.
7. **Wishlist**: free-text items either of them adds ("see pandas", "hike a wild Great Wall section"), with no place or date needed. Each item shows the result of the last check: covered (and where) or not covered (with a note).
8. **Suggestions**: places the Claude check proposes appear marked "suggested" on the map and in a list, either attached to a stop or as an idea pin off the route. Either user can accept one (it becomes a normal place at that stop, or for an idea pin: a new stop or a place at an existing stop) or dismiss it. The check never changes the route, stops or reservations; any change to the route is a user's click.
9. **Two users**, each with their own login. Both edit the same trip, changes appear live for the other, and items show who added them.

## Later version (before departure, not in v1)

- Offline mode (installable PWA): the plan, reservations and attachments are available with no connection.
- Taxi card: the hotel address in large Chinese characters.
- Polish for phone use on the go. v1 targets laptop and tablet but must not be broken on a phone.
- Offline map tiles.

## Non-goals

- No AI or recommendation engine inside the app.
- No multi-trip management, sharing with others, or public pages.
- No booking integrations (Trip.com, 12306, etc.). Reservations are entered by hand.
- No currency, budget or expense tracking.

## Anti-goals (failure even if it works)

- Anything that lives on Daan's work (Cradle) accounts, or that requires Cynthia to have a Claude or other third-party account.
- Any Google dependency (Maps, Fonts, Firebase, Google-hosted CDNs): Google is blocked in China, and the later trip-time version must work there.
- Trip data or attachments in the public repo.
- The Claude check silently changing the plan.
- Being heavier to use than a shared note. Adding a stop should take seconds.

## Constraints

- **Hosting:** static site on GitHub Pages under the personal GitHub account **DaanArt** (public repo, required for free Pages). Same account conventions as the earlier bas_cadeau project: commits use DaanArt's noreply email in the repo's local git config, and pushes go through `gh`'s DaanArt credentials, because the macOS keychain's default GitHub credential is the work account. Do not change global git config.
- **Data:** Supabase free tier, a project Daan has already created on a personal account. The Supabase URL and anon/publishable key go in the built site (public by design). The `service_role` key is never used in the app or committed.
- **Free-tier limits:** 500 MB database, 1 GB storage, and projects pause after about a week of inactivity (restore from the dashboard; worth a reminder before departure).
- **Region:** Supabase project in Singapore or Tokyo (closest to China). Daan picked it during sign-up; read it from the project, don't assume.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| A | Single HTML file with plain JS, libraries from CDN (like bas_cadeau) | Simplest and same deploy flow, but v1's feature set plus offline mode later would tangle in one file. |
| **B (chosen)** | **Vite + React + TypeScript project, built by GitHub Actions to Pages** | More setup, but stays manageable as features grow, allows unit tests on the core logic, and a PWA plugin makes offline mode easy later. |
| — | Self-hosting via ngrok, or a Claude artifact | Rejected earlier: unreliable from China / laptop must stay on; an artifact would live on the work account and require Cynthia to have a claude.ai account. |

Daan chose **B**.

## Decided design

### Stack

- Vite + React + TypeScript; Vitest for unit tests.
- Map: **Leaflet** with OpenStreetMap-based raster tiles; no API key, no Google.
- `@supabase/supabase-js` for auth, database, realtime and storage.
- Source repo on DaanArt (the public repo is the source; GitHub Actions builds and deploys to Pages). Vite `base` set to the repo path.

### Auth and access

- Supabase email + password auth. Public sign-ups **disabled**; accounts created by hand in the Supabase dashboard: one for Daan, one for Cynthia, and one for Claude (see the check below).
- Row Level Security on every table: only authenticated users can read and write. Since sign-ups are off, "authenticated" means exactly these accounts.
- Attachments in a **private** storage bucket with the same rule; the app shows files via signed URLs.
- Sessions persist, so each person logs in once per device.

### Data model (sketch; the builder may refine names and columns)

- `trip` — a single row: name, start date (2027-04-17), end date (2027-06-17), home label (e.g. "Amsterdam").
- `stops` — position (order), name, optional Chinese name, lat/lng, nights (0 or more; 0 = a day visit or pass-through), `no_booking_needed` flag with an optional note (e.g. "staying with friends"), notes, created_by.
- `legs` — transport data for the hop between two stops, keyed by `(from_stop_id, to_stop_id)`, where null means home for the inbound and outbound legs. Mode (train, flight, bus, car, other), `overnight` flag (sleeper train, red-eye: the night is spent travelling), `no_booking_needed` flag with an optional note (e.g. "bus, buy at the station"), optional manual travel time, notes. **Which legs exist is derived from stop order.** A leg row whose two stops are no longer adjacent is kept (it may hold reservations) but flagged; see the to-do rules.
- `reservations` — attached to either a stop or a leg. Kind (hotel, transport, activity, other), title, confirmation number, start and end date/time, address, optional address in Chinese, free-form details, created_by.
- `attachments` — reservation_id, storage path, filename, content type.
- `places` — stop_id (**optional**: null = idea pin off the route), name, lat/lng, note, source (`manual` or `claude`), status (`active`, `suggested`, `dismissed`), optional wishlist_item_id it relates to, created_by. Turning an idea pin into a stop creates the stop and links or retires the place (builder's call).
- `wishlist_items` — text, note, created_by, plus check results: status (`unchecked`, `covered`, `not_covered`), check note (e.g. "Chengdu, day 9"), optional covered_by_stop_id, checked_at.

### Dates

- 17 April is the day they **arrive** at the first stop. A stop with N nights occupies N nights; the next stop starts on the day the previous one ends (the travel day). A stop with 0 nights starts and ends on the same day.
- An **overnight leg** spends one night travelling: it departs on the day the from-stop ends and the to-stop starts the next day. That night counts as planned and needs no hotel.
- Planned nights = sum of stop nights + number of overnight legs (the inbound and outbound legs don't count; they fall outside the 61 nights). Unplanned = 61 − planned. If planned > 61, the trip overruns 17 June and that's shown as a warning.
- Leg date = the **departure** day (the day the from-stop ends), except for the **inbound** leg, whose date is its **arrival** day, 17 April (the flight from home may leave on the 16th). The outbound leg's date is the day the last stop ends (ideally 17 June).
- The timelapse runs from 17 April to 17 June inclusive. On an overnight leg's night, the marker is on the leg.

### To-do rules (derived, never stored)

1. **Unplanned nights:** "N nights still unplanned before 17 June" while planned < 61.
2. **Overrun:** "Plan runs N nights past 17 June" while planned > 61.
3. **Leg not booked:** each leg in the current route (including inbound and outbound) with no transport reservation and not marked `no_booking_needed` → "Book {mode} {from} → {to}, {date}".
4. **Leg booking on the wrong date:** a transport reservation whose date differs from the leg's date (departure date, or arrival date for the inbound leg) → "Train {from} → {to} is booked for {date}, but the plan says {date}".
5. **Night without a hotel:** each night of a stop not covered by any hotel reservation on that stop, unless the stop is marked `no_booking_needed` → grouped as "Book hotel in {city}, {date range}". Nights on overnight legs never need a hotel; 0-night stops never do either.
6. **Hotel dates don't match:** a hotel reservation whose check-in/check-out falls outside the stop's dates (e.g. after an earlier stop changed) → "Hotel in {city} booked {dates}, stay is now {dates}".
7. **Orphaned leg booking:** a leg row with a reservation whose stops are no longer adjacent → "Booking {from} → {to} no longer matches the route".

These rules are the core logic and get unit tests. "Never ticked by hand" still holds: a to-do goes away when a reservation covers it, or when the stop or leg is marked "no booking needed", which is a fact about the plan rather than a tick.

### Distance and travel time

- Distance: straight-line (haversine) between stops, shown as an approximation.
- Travel time: estimated from distance and mode using rough average speeds (left to the builder), overridable per leg by hand. The point is to make an unrealistic hop stand out, not to be exact.

### Screens (v1)

- **Main screen:** the map takes most of the space. A side panel holds the ordered stop list (add, reorder, set nights), the to-do list, and the wishlist. The timelapse bar runs along the bottom. Selecting a stop or leg opens its details: reservations, attachments, places, notes.
- **Adding a stop:** search a place by name (geocoding without Google, e.g. OSM Nominatim or Photon, within their usage policies) or click on the map.
- **Login screen.**
- UI language: English.

### Live updates

Supabase Realtime subscriptions on the trip tables, so changes by one user appear for the other without a refresh. Last write wins; acceptable for two people.

### The Claude check (outside the app)

- Runs in a Claude Code session in this repo when Daan asks for it.
- Claude signs in with its **own Supabase account** (credentials in a gitignored local env file), so it's bound by the same access rules and never needs the `service_role` key.
- A small script in the repo exports the plan and wishlist as JSON for Claude to read, and lets Claude write results back:
  - updates each wishlist item's check status and note
  - inserts places with `source = claude`, `status = suggested`, attached to a stop or as an idea pin (no stop), optionally linked to the wishlist item they serve
- The check only writes those two things. It never edits stops, legs or reservations.

## Left to the builder

- Exact component structure, state management and styling. Keep it light; no heavy UI framework is required.
- Tile provider, as long as it's free, keyless and not Google. Prefer tiles with Latin-script labels in China if available, and verify.
- Geocoder choice within the constraints above.
- Average speeds for travel-time estimates.
- How reordering works in the UI (drag, or up/down buttons).
- The exact form of the check script (Node script, npm script, etc.).
- Repo name on DaanArt (proposed: `china-trip`). Add `noindex`.

## Status

- Supabase account exists; project URL and anon key are still to be handed over.
- **Database setup** is done by the builder with the Supabase CLI: Daan runs `supabase login` (and `supabase link`, which asks for the database password) themselves, so the token and password never pass through chat. Schema, access rules, the storage bucket and settings are applied as versioned SQL migrations in the repo, and the access rules are tested against the real project with the anon key (a stranger must see nothing). The three user accounts are created in the dashboard or via the CLI. Daan revokes the CLI access token after setup if they want.
- `china_trip` is not yet a git repository; the repo gets created at the start of implementation, and this document gets committed then.
