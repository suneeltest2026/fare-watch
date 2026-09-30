-- ============================================================
-- Fare Watch by MoneyMuni — database setup
-- Paste this whole file into Supabase -> SQL Editor -> Run.
-- Safe to run more than once.
-- ============================================================

create table if not exists public.runs (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('weekly', 'retry', 'manual')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  searches_used int not null default 0,
  ok_count int not null default 0,
  error_count int not null default 0,
  notes text
);

create table if not exists public.fare_checks (
  id bigint generated always as identity primary key,
  run_id bigint references public.runs(id) on delete set null,
  created_at timestamptz not null default now(),
  check_date date not null,
  route text not null,
  season text not null check (season in ('peak', 'off')),
  trip_type text not null check (trip_type in ('oneway', 'return')),
  departure_date date not null,
  return_date date,
  status text not null check (status in ('ok', 'not_available', 'error')),
  price_aed numeric,
  airline text,
  stops int,
  duration_min int,
  price_insights jsonb,
  error text
);

create index if not exists fare_checks_lookup
  on public.fare_checks (route, season, trip_type, check_date);

-- Row Level Security: ON for both tables
alter table public.runs enable row level security;
alter table public.fare_checks enable row level security;

-- Public website may only READ fare data (no writes, no run logs)
drop policy if exists "Public can read fare checks" on public.fare_checks;
create policy "Public can read fare checks"
  on public.fare_checks for select
  to anon, authenticated
  using (true);

-- Table permissions (needed because "auto-expose new tables" is OFF)
grant usage on schema public to anon, authenticated, service_role;
grant select on public.fare_checks to anon, authenticated;
grant all on public.fare_checks to service_role;
grant all on public.runs to service_role;
