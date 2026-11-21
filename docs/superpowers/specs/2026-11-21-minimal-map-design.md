# Adventure-map look — design

Date: 2026-11-21 · Restyle of the live v1 planner. Replaces the earlier "minimal map" draft.

## Intent

Daan finds the current map (openstreetmap.de raster tiles) ugly and busy. They want a low-detail, game-style world map ("GTA-style, doesn't have to be an actual map of China but roughly look like it"). From two mockups they picked **B, "cartoon"**: cream China with a thick dark outline, beige neighbours, a blue sea with a light grid, red numbered pins and a dotted route. They then asked for **the whole app in this style**.

## Decided (by Daan)

- Map in mockup-B style (`mockups/map-B-cartoon.png`): no tiles, no roads, rivers, borders or basemap labels; only the trip's own stops are named.
- Numbered pin icons for stops; lighter pins for ideas; dashed pins for suggestions.
- The rest of the app matches the map's style.

## Approaches (map)

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | Ship a heavily simplified outline of China and its surroundings (Natural Earth 1:50m, public domain, simplified to ~6 KB) inside the app; draw it with Leaflet as shapes on a CSS sea | No map service at all: nothing to block in China, works offline, the app gets smaller. Not zoomable to street level, which isn't needed |
| B | Vector tiles (OpenFreeMap) with a custom style | Real geography at every zoom, but a third-party service, ~250 KB more, and it can't look as "game" as A |

## Design (builder's calls)

**Map**
- `src/ui/map/world.ts`: generated GeoJSON for China (highlighted) and the dissolved surrounding land (no internal borders), from `scripts/build-world.sh` (mapshaper, 3% simplification, small islands dropped). The source data is not committed, only the result.
- Leaflet with no tile layer; sea, grid and colours in CSS. Zoom limited to about 3.5–8 and panning kept around China.
- Pins: SVG `DivIcon`s as in the mockup. Stop names are permanent bold uppercase labels with a cream halo. Idea and place pins are small grey pins with their name on hover/tap. Suggestions are dashed outlines.
- Route: dark dotted line. Overnight legs use a longer dash. A selected leg is drawn thicker in red.
- Timelapse marker: a yellow dot with a dark outline. The travelled part is a solid dark line.
- Attribution: "Map data: Natural Earth".

**Whole app**
- One light theme; the dark-mode variant is dropped.
- Palette: cream panels `#fbf1d6`, page/sea blue `#7fc4dd`, ink `#2f2f2f`, red `#e8343f`, beige `#e6d6b0`, yellow `#ffd23f`.
- Thick dark outlines (2–3 px) on panels, cards, buttons and inputs. A small hard offset shadow (no blur) gives a sticker or board-game feel. Slightly rounded corners.
- Type: a rounded, chunky font bundled with the app (Fredoka via `@fontsource`, self-hosted, not Google Fonts), with a system-font fallback. Headings, tabs and buttons in bold uppercase with letter-spacing, like the map labels.
- Buttons are chunky: the primary one red with white text, secondary ones cream; they press down on click (the shadow shrinks).
- Tabs look like folder tabs on top of the side panel. To-do items look like quest cards: red for problems, yellow for unplanned nights.
- The login screen is a cream card on the blue grid background.
- Accessibility: text contrast at least 4.5:1, a visible focus ring, and no information conveyed by colour alone (to-do kinds also differ in wording).

## Tests

**The live trip now holds real stops**, so e2e moves off the live project. It runs against a **local Supabase in Docker** (`npx supabase start`), built from the same migrations, with a local test account. The dev server runs in a `test` mode that points at the local stack (`.env.test`, local default keys, not secrets). The live-data guard becomes a guard that refuses any non-local Supabase URL. `check-access` stays read-only against live.

- e2e: the map makes no tile requests at all, and nothing goes to Google or OSM; the China shape is drawn; a stop shows as a pin with its number and name; an idea pin uses the lighter pin.
- The existing e2e and unit suites stay green (the restyle keeps every accessible name).
- Screenshots of the login, route, stop detail, to-do and wishlist screens are reviewed by Daan before deploy.

## Not in scope

Layout changes, new features, phone polish (the "before you fly" version).
