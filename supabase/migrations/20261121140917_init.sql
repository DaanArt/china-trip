-- China trip planner: schema, access rules, attachment storage, realtime.
-- Columns mirror src/domain/types.ts exactly.

-- ---------------------------------------------------------------- tables

create table public.trip (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  home_label text not null default 'Home'
);

insert into public.trip (name, start_date, end_date, home_label)
values ('China 2027', '2027-04-17', '2027-06-17', 'Home');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null
);

create table public.stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip on delete cascade,
  position integer not null,
  name text not null,
  name_zh text,
  lat double precision not null,
  lng double precision not null,
  nights integer not null default 1 check (nights >= 0),
  no_booking_needed boolean not null default false,
  no_booking_note text,
  notes text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table public.legs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip on delete cascade,
  from_stop_id uuid references public.stops on delete cascade,
  to_stop_id uuid references public.stops on delete cascade,
  mode text not null default 'train' check (mode in ('train', 'flight', 'bus', 'car', 'other')),
  overnight boolean not null default false,
  no_booking_needed boolean not null default false,
  no_booking_note text,
  manual_hours double precision check (manual_hours is null or manual_hours >= 0),
  notes text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (from_stop_id, to_stop_id)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip on delete cascade,
  stop_id uuid references public.stops on delete cascade,
  leg_id uuid references public.legs on delete cascade,
  kind text not null check (kind in ('hotel', 'transport', 'activity', 'other')),
  title text not null,
  confirmation text,
  start_date date,
  start_time text,
  end_date date,
  end_time text,
  address text,
  address_zh text,
  details text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  check ((stop_id is null) <> (leg_id is null))
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations on delete cascade,
  storage_path text not null,
  filename text not null,
  content_type text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip on delete cascade,
  text text not null,
  note text,
  status text not null default 'unchecked' check (status in ('unchecked', 'covered', 'not_covered')),
  check_note text,
  covered_by_stop_id uuid references public.stops on delete set null,
  checked_at timestamptz,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip on delete cascade,
  stop_id uuid references public.stops on delete set null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  note text,
  source text not null default 'manual' check (source in ('manual', 'claude')),
  status text not null default 'active' check (status in ('active', 'suggested', 'dismissed')),
  wishlist_item_id uuid references public.wishlist_items on delete set null,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------- access rules
-- Sign-ups are disabled, so "authenticated" means exactly the accounts
-- created by hand (Daan, Cynthia, Claude). Anonymous visitors get nothing.

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.trip enable row level security;
alter table public.profiles enable row level security;
alter table public.stops enable row level security;
alter table public.legs enable row level security;
alter table public.reservations enable row level security;
alter table public.attachments enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.places enable row level security;

create policy "members manage trip" on public.trip for all to authenticated using (true) with check (true);
create policy "members manage stops" on public.stops for all to authenticated using (true) with check (true);
create policy "members manage legs" on public.legs for all to authenticated using (true) with check (true);
create policy "members manage reservations" on public.reservations for all to authenticated using (true) with check (true);
create policy "members manage attachments" on public.attachments for all to authenticated using (true) with check (true);
create policy "members manage wishlist" on public.wishlist_items for all to authenticated using (true) with check (true);
create policy "members manage places" on public.places for all to authenticated using (true) with check (true);

create policy "members read profiles" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- -------------------------------------------------------------- storage

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 52428800);

create policy "members read attachments" on storage.objects
  for select to authenticated using (bucket_id = 'attachments');
create policy "members upload attachments" on storage.objects
  for insert to authenticated with check (bucket_id = 'attachments');
create policy "members delete attachments" on storage.objects
  for delete to authenticated using (bucket_id = 'attachments');

-- ------------------------------------------------------------- realtime

alter publication supabase_realtime
  add table public.trip, public.profiles, public.stops, public.legs,
            public.reservations, public.attachments, public.wishlist_items, public.places;
