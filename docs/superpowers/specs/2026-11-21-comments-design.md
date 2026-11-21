# Comments — design and plan

Date: 2026-11-21 · Approved by Daan (design and live database change).

## Intent
Add comments to **wishlist items, activities and own to-dos**. They're hidden behind a "💬 Comments (n)" toggle.

## Design
- **Table `comments`:**
  - `id`, `trip_id`, `body` (not empty)
  - `wishlist_item_id`, `activity_id`, `task_id`: exactly one is set (`num_nonnulls = 1`), and the comment is deleted with its item
  - `created_by` (default `auth.uid()`, not null), `created_at`, `edited_at`
- **Access:**
  - every member can read all comments
  - members can insert, update and delete only their own (`created_by = auth.uid()`)
  - realtime enabled
- **UI:** a `Comments` component under each wishlist item, activity card and to-do.
  - Collapsed by default, showing the count.
  - Opened: oldest first, showing author, relative time and the text with safe links (`linkify`).
  - Your own comments have Edit and Delete. Edit is inline; saving sets `edited_at` and shows "(edited)".
  - "Add a comment" box with a Post button.
- **Domain:** `timeAgo(iso, now)`:
  - under a minute: "just now"
  - under an hour: "N min ago"
  - under a day: "N h ago"
  - under a week: "N d ago"
  - otherwise the local date, "17 Apr"

## Plan
1. Migration, applied locally, then `check-access` and types updated.
2. TDD for `timeAgo`.
3. e2e first (`e2e/comments.e2e.ts`):
   - comment on a wish, an activity and a to-do
   - collapsed by default with the count
   - edit your own comment
   - the other user's comment has no Delete button, and the API refuses deleting or editing it
   - deleting the item removes its comments
4. Then build: provider, actions, the `Comments` component, and wiring it into the three places.
5. Deploy: `db push --remote --yes`, check-access, merge, push, watch, then a read-only live check.
