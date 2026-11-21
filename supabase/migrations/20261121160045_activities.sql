-- Activities per stop, ranked by each traveller's hearts (0-3), with their own bookings.
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip on delete cascade,
  stop_id uuid not null references public.stops on delete cascade,
  title text not null check (length(trim(title)) > 0),
  notes text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table public.activity_votes (
  activity_id uuid not null references public.activities on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  hearts integer not null check (hearts between 0 and 3),
  primary key (activity_id, user_id)
);

-- A booking now belongs to exactly one of: a stop, a journey (leg) or an activity.
alter table public.reservations add column activity_id uuid references public.activities on delete cascade;
alter table public.reservations drop constraint reservations_check;
alter table public.reservations add constraint reservations_one_target check (num_nonnulls(stop_id, leg_id, activity_id) = 1);

revoke all on public.activities, public.activity_votes from anon;
grant select, insert, update, delete on public.activities, public.activity_votes to authenticated;
alter table public.activities enable row level security;
alter table public.activity_votes enable row level security;

create policy "members manage activities" on public.activities for all to authenticated using (true) with check (true);
-- Everyone sees all hearts, but only gives their own.
create policy "members read votes" on public.activity_votes for select to authenticated using (true);
create policy "own vote insert" on public.activity_votes for insert to authenticated with check (user_id = auth.uid());
create policy "own vote update" on public.activity_votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own vote delete" on public.activity_votes for delete to authenticated using (user_id = auth.uid());

alter publication supabase_realtime add table public.activities, public.activity_votes;
