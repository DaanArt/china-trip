-- Comments on wishlist items, activities and own to-dos.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip on delete cascade,
  wishlist_item_id uuid references public.wishlist_items on delete cascade,
  activity_id uuid references public.activities on delete cascade,
  task_id uuid references public.tasks on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint comments_one_target check (num_nonnulls(wishlist_item_id, activity_id, task_id) = 1)
);

revoke all on public.comments from anon;
grant select, insert, update, delete on public.comments to authenticated;
alter table public.comments enable row level security;
-- Everyone reads all comments; each person writes, edits and deletes only their own.
create policy "members read comments" on public.comments for select to authenticated using (true);
create policy "own comment insert" on public.comments for insert to authenticated with check (created_by = auth.uid());
create policy "own comment update" on public.comments for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "own comment delete" on public.comments for delete to authenticated using (created_by = auth.uid());

alter publication supabase_realtime add table public.comments;
