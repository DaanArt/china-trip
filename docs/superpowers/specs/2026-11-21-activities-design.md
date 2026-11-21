# Activities per stop — design

Date: 2026-11-21 · Feature on the live planner.

## Intent

Clicking a stop's pin (or its name) should give access to an **Activities** tab for that location. In it, Daan and Cynthia suggest things to do there, **rank** them, and add text to each one, such as links, notes, or the activity's reservation and tickets.

## Decided (by Daan)

- **Ranking by votes:** each person gives each activity 0–3 hearts. The list sorts by total, so "we both really want this" rises to the top, and you can see who wants what.
- **Activities are separate from Places:** the existing map pins stay as they are.

## Design (builder's calls)

**Data (one migration, applied to live with Daan's consent)**
- `activities`: `id`, `trip_id`, `stop_id` (required; deleted with the stop), `title` (not empty), `notes` text, `created_by`, `created_at`.
- `activity_votes`: `(activity_id, user_id)` primary key, `hearts` 0–3; deleted with the activity.
  - Access: every member can read all votes, but can only insert, update or delete their own (`user_id = auth.uid()`).
- `reservations` gains `activity_id` (deleted with the activity). The check becomes "exactly one of `stop_id`, `leg_id`, `activity_id`". So an activity's bookings reuse the existing reservation form and file attachments. The to-do rules still look only at stop and leg reservations.
- Realtime is enabled on both new tables.

**Domain (unit-tested)**
- `rankActivities(activities, votes)` returns each activity with its total and its votes per user. Order: total first (high to low), then oldest first.
- `linkify(text)` splits notes into text and `http(s)` link segments. Only http and https become links, never `javascript:`.

**UI**
- The stop panel gets two tabs: **Overview** (everything that's there today) and **Activities (n)**. The panel remembers the last tab per device and starts on Overview.
- **Activity card:**
  - the title and the total hearts
  - one row of hearts per traveller: your own row is clickable (click the same heart again to lower it), Cynthia's is read-only
  - notes, with links clickable and opening in a new tab
  - **Bookings**, using the existing reservation component (kind defaults to "activity", files work as for hotels)
  - "added by …", plus Edit and Delete
- **Adding:** title plus optional notes at the top of the tab.
- **Deleting a stop:** the confirm now also counts its activities ("Delete Chengdu, its 1 reservation and 3 activities?"). The existing rule still applies: journeys with bookings block deletion.
- **Travellers** are the trip members except the Claude account, as for to-do assignees.

## Tests

- Unit: rank order and totals, ties, a missing vote counting as 0, `linkify` (http, https, rejecting `javascript:`, URLs next to punctuation).
- e2e (local Supabase):
  - opening a stop and going to Activities, adding an activity with a link in the notes, the link is clickable
  - voting changes the total and the order
  - the other traveller's hearts can't be clicked
  - adding a booking with a file to an activity
  - activities count in the stop-delete confirm
- Access test: anon can't read `activities` or `activity_votes`.

## Not in scope

Activities without a stop, scheduling activities on specific days, comments or threads.
