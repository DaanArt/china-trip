-- To-dos added by the travellers themselves (the automatic ones are derived in the app).
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip on delete cascade,
  text text not null check (length(trim(text)) > 0),
  done boolean not null default false,
  done_at timestamptz,
  assignee_ids uuid[] not null default '{}',
  stop_id uuid references public.stops on delete set null,
  due_date date,
  source_todo_id text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);

revoke all on public.tasks from anon;
grant select, insert, update, delete on public.tasks to authenticated;
alter table public.tasks enable row level security;
create policy "members manage tasks" on public.tasks for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.tasks;
