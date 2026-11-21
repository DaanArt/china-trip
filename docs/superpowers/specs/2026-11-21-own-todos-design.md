# Own to-dos and suggestions — design

Date: 2026-11-21 · Small feature on the live planner.

## Intent

Daan wants the To do tab split in two. The to-dos that **they and Cynthia add themselves** are the prominent list. The **automatic to-dos** (booking gaps, unplanned nights, wrong dates) are tucked away in a collapsed section and treated as suggestions.

## Decided (by Daan)

- Own to-dos are shown first and prominently. The automatic ones live in a collapsed "Suggestions (n)" section that opens with a click.
- A suggestion can be **copied** to the list with "Add to our list". The copy is a normal to-do that you tick off yourself; the suggestion stays until the plan resolves it.
- An own to-do has its text and a checkbox, plus optionally **who does it** (Daan, Cynthia or both), a **linked stop**, and a **due date**. Who added it is always shown.

## Design (builder's calls)

- **New table `tasks`:**
  - `id`, `trip_id`, `text` (not empty), `done` (default false), `done_at`
  - `assignee_ids uuid[]` (default `{}`)
  - `stop_id` (on delete set null)
  - `due_date` (date, nullable)
  - `source_todo_id` (text, nullable: the suggestion it was copied from)
  - `created_by`, `created_at`
  - Same access rules as the other tables (signed-in members only), plus realtime. Applied to live with a migration, with Daan's consent.
- **Order of the open list:** overdue first (due before today, shown in red), then by due date (no date last), then oldest first. Done items go into a collapsed "Done (n)" section and can be unticked.
- **Today** is the device's local date, so overdue matches what the person sees on their own calendar.
- **The To do tab count** shows only open own to-dos.
- **Each to-do row:** checkbox, text, and small tags for due date, stop (clickable, opens the stop) and assignees, plus "added by …". Edit and delete through a small menu.
- **Adding:** a text field at the top ("Add a to-do…") with optional assignee chips, stop picker and date.
- **The suggestions section:**
  - It shows the current automatic to-dos as before; each opens its stop or journey.
  - Each has an "Add to our list" button, which copies its text and stop.
  - A suggestion already copied (an open or done task with the same `source_todo_id`) shows "✓ on our list" instead of the button.
  - The section starts collapsed, and stays open or closed per device.
- **A stop's page** gets a "To-dos" section listing the to-dos linked to it, with an add box that has the stop preselected.
- **Assignable people** are the trip members' profiles, except the Claude account.

## Tests

- Unit (`src/domain/tasks.ts`):
  - the sort order: overdue first, then due date, then created_at
  - done items are separated
  - overdue is counted against a given "today"
  - "on our list" detection by `source_todo_id`
- e2e (local Supabase):
  - add a to-do with an assignee, stop and due date; it appears at the top and is shared live
  - tick it off: it moves to Done and the tab count drops
  - suggestions are collapsed by default; expanding one and choosing "Add to our list" copies it and then shows "✓ on our list"
  - a to-do linked to a stop shows on that stop's page
  - the access test covers `tasks`

## Not in scope

Notifications or reminders, recurring to-dos, sub-tasks.
