# Activities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Per-stop Activities tab: add activities with notes and links, rank them by per-person hearts (0–3), and attach bookings with files.

**Spec:** `docs/superpowers/specs/2026-11-21-activities-design.md`

## Global Constraints

- e2e only against local Supabase. The live migration push (this migration only) was consented by Daan on 2026-11-21.
- Votes may only be written for oneself (enforced by RLS, not only the UI).
- Notes are rendered as text plus `http(s)` links only. No HTML injection.
- Existing accessible names stay the same.

## Review Focus

1. A reservation must still have exactly one target (stop, leg or activity). Pinned by the migration check and an e2e insert attempt.
2. One person must not be able to change another's hearts through the API. Pinned by an e2e test against local RLS.
3. Deleting a stop takes its activities with it, and the confirm says so.

### Task 1: Schema

- [ ] Migration:
  - `activities` table
  - `activity_votes` table with own-row write policies
  - `reservations.activity_id`, replacing the old check with `num_nonnulls(stop_id, leg_id, activity_id) = 1`
  - grants and realtime for the new tables
- [ ] Apply locally. Add both new tables to `check-access` and add the types.

### Task 2: Domain

- [ ] Tests, then implementation, for:
  - `rankActivities(activities, votes)`: returns `{ activity, total, byUser: Record<userId, hearts> }[]` sorted by total (high first), then `created_at`
  - `linkify(text)`: returns `{ text } | { href, text }` segments for http and https only, trimming trailing punctuation from URLs

### Task 3: Data and UI

- [ ] e2e first (`e2e/activities.e2e.ts`):
  - **Add:** add an activity with a link and check the link is clickable.
  - **Voting:** voting reorders the list.
  - **Read-only hearts:** the other traveller's hearts are disabled.
  - **API:** an API attempt to write another user's vote fails.
  - **Bookings:** an activity booking with a file works.
  - **Stop delete:** the confirm counts the activities.
  - **Reservation target:** a reservation with two targets is rejected.
- [ ] Provider: load `activities` and `activity_votes`.
- [ ] Actions:
  - `addActivity`, `updateActivity`, `deleteActivity`
  - `vote(activityId, hearts)` (upsert own; 0 deletes the row)
  - `addReservation` accepts `{ activity_id }`
- [ ] UI:
  - StopDetail tabs (Overview / Activities), with the last tab kept in localStorage
  - `ActivitiesPanel` and `ActivityCard` with hearts, notes and Reservations
  - the delete confirm counts activities
- [ ] Run the full suites, take a screenshot, then commit.

### Task 4: Deploy

- [ ] `db push --remote --yes`, then check-access.
- [ ] Merge, push, and watch the deploy.
- [ ] Read-only live check: the Activities tab opens on a stop.
