create extension if not exists pgcrypto;

create table if not exists public.patient_records (
  id uuid primary key default gen_random_uuid(),
  record_name text not null default 'Untitled Patient',
  patient_last_name text,
  patient_first_name text,
  patient_data jsonb not null default '{}'::jsonb,
  favorite_statuses text[] not null default array[]::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.patient_records
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.patient_records
  add column if not exists archived_at timestamptz;

create index if not exists patient_records_updated_at_idx
  on public.patient_records (updated_at desc);

create index if not exists patient_records_archived_at_idx
  on public.patient_records (archived_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_patient_records_updated_at on public.patient_records;

create trigger set_patient_records_updated_at
before update on public.patient_records
for each row
execute function public.set_updated_at();

alter table public.patient_records enable row level security;

drop policy if exists "patient_records_select_all" on public.patient_records;
create policy "patient_records_select_all"
on public.patient_records
for select
to anon, authenticated
using (true);

drop policy if exists "patient_records_insert_all" on public.patient_records;
create policy "patient_records_insert_all"
on public.patient_records
for insert
to anon, authenticated
with check (true);

drop policy if exists "patient_records_update_all" on public.patient_records;
create policy "patient_records_update_all"
on public.patient_records
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "patient_records_delete_all" on public.patient_records;
create policy "patient_records_delete_all"
on public.patient_records
for delete
to anon, authenticated
using (true);

create table if not exists public.app_preferences (
  preference_key text primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_app_preferences_updated_at on public.app_preferences;

create trigger set_app_preferences_updated_at
before update on public.app_preferences
for each row
execute function public.set_updated_at();

alter table public.app_preferences enable row level security;

drop policy if exists "app_preferences_select_all" on public.app_preferences;
create policy "app_preferences_select_all"
on public.app_preferences
for select
to anon, authenticated
using (true);

drop policy if exists "app_preferences_insert_all" on public.app_preferences;
create policy "app_preferences_insert_all"
on public.app_preferences
for insert
to anon, authenticated
with check (true);

drop policy if exists "app_preferences_update_all" on public.app_preferences;
create policy "app_preferences_update_all"
on public.app_preferences
for update
to anon, authenticated
using (true)
with check (true);

create table if not exists public.dental_charts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  chart_data jsonb not null default '{}'::jsonb,
  summary text,
  chart_mode text,
  version integer not null default 1,
  last_edited_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint dental_charts_patient_id_fkey
    foreign key (patient_id)
    references public.patient_records (id)
    on delete cascade,
  constraint dental_charts_patient_id_key unique (patient_id)
);

create index if not exists dental_charts_patient_id_idx
  on public.dental_charts (patient_id);

create index if not exists dental_charts_updated_at_idx
  on public.dental_charts (updated_at desc);

drop trigger if exists set_dental_charts_updated_at on public.dental_charts;

create trigger set_dental_charts_updated_at
before update on public.dental_charts
for each row
execute function public.set_updated_at();

alter table public.dental_charts enable row level security;

drop policy if exists "dental_charts_select_all" on public.dental_charts;
create policy "dental_charts_select_all"
on public.dental_charts
for select
to anon, authenticated
using (true);

drop policy if exists "dental_charts_insert_all" on public.dental_charts;
create policy "dental_charts_insert_all"
on public.dental_charts
for insert
to anon, authenticated
with check (true);

drop policy if exists "dental_charts_update_all" on public.dental_charts;
create policy "dental_charts_update_all"
on public.dental_charts
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "dental_charts_delete_all" on public.dental_charts;
create policy "dental_charts_delete_all"
on public.dental_charts
for delete
to anon, authenticated
using (true);
