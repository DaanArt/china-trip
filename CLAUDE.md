# China trip planner

Shared trip planner for Daan and Cynthia (17 April – 17 June 2027). Static Vite + React app on GitHub Pages (DaanArt), data in Supabase (project `china-trip`, ref `rbfdovrgylrvhwahyusz`). Design: `docs/superpowers/specs/2026-11-21-trip-planner-design.md`.

## Rules
- Never print, copy or commit the Supabase `service_role`/secret key. Only the URL and publishable key (in `.env`) belong in the app.
- `.env.claude` holds Claude's own Supabase login; it is gitignored. Never commit it.
- Git identity is local to this repo (DaanArt noreply). Never change global git config. Push with:
  `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`
- No Google services (blocked in China).

## Wishlist check (when Daan asks for it)
1. `npx tsx scripts/trip-check.ts export > <scratchpad>/plan.json` and read it.
2. For each wishlist item, decide covered / not covered against the route, with a short note (e.g. "Chengdu, day 9").
   Suggest places that serve the wishlist: attached to a stop (`stop_id`) when near one, otherwise as an idea pin (`stop_id: null`).
3. Write `<scratchpad>/check.json` as `{ "wishlist": [{id, status, check_note, covered_by_stop_id}], "suggestions": [{name, lat, lng, note, stop_id, wishlist_item_id}] }`.
4. `npx tsx scripts/trip-check.ts apply <scratchpad>/check.json`.
The check never changes stops, legs or reservations; the script refuses anything but wishlist updates and suggested places. Existing place names (including dismissed ones) are skipped, so re-running is safe.

## Tests
- `npm test` — unit tests (domain logic in `src/domain/`).
- `npm run e2e` — Playwright against a **local** Supabase only (never the live trip). First `npx supabase start` (Docker), then write `.env.test` from `npx supabase status -o json` (`VITE_SUPABASE_URL`=API_URL, `VITE_SUPABASE_ANON_KEY`=ANON_KEY, `SUPABASE_LOCAL_SERVICE_KEY`=SERVICE_ROLE_KEY; local defaults, gitignored). The global setup refuses any non-local URL and creates the local test user.
- `npm run check-access` — strangers must see nothing; sign-ups must be off.

## Database changes
Add a migration in `supabase/migrations/`, then `npx supabase db push --remote` (the CLI asks Daan for consent in agent mode).

## Deploy
Push to `main`; GitHub Actions builds and publishes to https://daanart.github.io/china-trip/.
