create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Shared trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.normalize_patient_search_text(
  record_name text,
  patient_last_name text,
  patient_first_name text
)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      concat_ws(' ', lower(coalesce(record_name, '')), lower(coalesce(patient_last_name, '')), lower(coalesce(patient_first_name, ''))),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

alter table public.patient_records
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists archived_at timestamptz,
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists search_text text generated always as (
    public.normalize_patient_search_text(record_name, patient_last_name, patient_first_name)
  ) stored;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'patient_records_record_name_not_blank'
  ) then
    alter table public.patient_records
      add constraint patient_records_record_name_not_blank
      check (btrim(record_name) <> '');
  end if;
end;
$$;

create index if not exists patient_records_active_lookup_idx
  on public.patient_records (archived_at, updated_at desc);

create index if not exists patient_records_name_search_idx
  on public.patient_records using gin (search_text gin_trgm_ops);

create index if not exists patient_records_patient_name_idx
  on public.patient_records (lower(patient_last_name), lower(patient_first_name));

create index if not exists patient_records_patient_data_gin_idx
  on public.patient_records using gin (patient_data);

drop trigger if exists set_patient_records_updated_at on public.patient_records;
create trigger set_patient_records_updated_at
before update on public.patient_records
for each row
execute function public.set_updated_at();

alter table public.app_preferences
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_preferences_key_not_blank'
  ) then
    alter table public.app_preferences
      add constraint app_preferences_key_not_blank
      check (btrim(preference_key) <> '');
  end if;
end;
$$;

drop trigger if exists set_app_preferences_updated_at on public.app_preferences;
create trigger set_app_preferences_updated_at
before update on public.app_preferences
for each row
execute function public.set_updated_at();

alter table public.dental_charts
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists version integer not null default 1,
  add column if not exists chart_mode text,
  add column if not exists last_edited_by text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dental_charts_version_positive'
  ) then
    alter table public.dental_charts
      add constraint dental_charts_version_positive
      check (version > 0);
  end if;
end;
$$;

create index if not exists dental_charts_patient_updated_idx
  on public.dental_charts (patient_id, updated_at desc);

create index if not exists dental_charts_chart_mode_idx
  on public.dental_charts (chart_mode);

create index if not exists dental_charts_chart_data_gin_idx
  on public.dental_charts using gin (chart_data);

drop trigger if exists set_dental_charts_updated_at on public.dental_charts;
create trigger set_dental_charts_updated_at
before update on public.dental_charts
for each row
execute function public.set_updated_at();

create table if not exists public.clinic_appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid,
  title text not null default 'Appointment',
  appointment_type text not null default 'appointment',
  source text not null default 'manual',
  status text not null default 'scheduled',
  dentist_name text,
  appointment_date date not null,
  start_time time,
  end_time time,
  reason text,
  notes text,
  treatment_tag text,
  linked_progress_note_id text,
  linked_bill_id text,
  google_event_id text,
  online_booking_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_by text,
  last_edited_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  constraint clinic_appointments_patient_id_fkey
    foreign key (patient_id)
    references public.patient_records (id)
    on delete cascade,
  constraint clinic_appointments_type_check
    check (appointment_type in ('appointment', 'recall', 'birthday', 'event', 'online_booking', 'google_calendar')),
  constraint clinic_appointments_status_check
    check (status in ('pending', 'scheduled', 'completed', 'cancelled', 'rescheduled', 'missed', 'no_show'))
);

create index if not exists clinic_appointments_patient_idx
  on public.clinic_appointments (patient_id, appointment_date desc);

create index if not exists clinic_appointments_date_idx
  on public.clinic_appointments (appointment_date, start_time);

create index if not exists clinic_appointments_active_idx
  on public.clinic_appointments (archived_at, appointment_date, start_time);

create unique index if not exists clinic_appointments_progress_note_recall_idx
  on public.clinic_appointments (patient_id, linked_progress_note_id)
  where source = 'progress_note_recall' and linked_progress_note_id is not null;

drop trigger if exists set_clinic_appointments_updated_at on public.clinic_appointments;
create trigger set_clinic_appointments_updated_at
before update on public.clinic_appointments
for each row
execute function public.set_updated_at();

alter table public.clinic_appointments enable row level security;

drop policy if exists "clinic_appointments_select_all" on public.clinic_appointments;
create policy "clinic_appointments_select_all"
on public.clinic_appointments
for select
to anon, authenticated
using (true);

drop policy if exists "clinic_appointments_insert_all" on public.clinic_appointments;
create policy "clinic_appointments_insert_all"
on public.clinic_appointments
for insert
to anon, authenticated
with check (true);

drop policy if exists "clinic_appointments_update_all" on public.clinic_appointments;
create policy "clinic_appointments_update_all"
on public.clinic_appointments
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "clinic_appointments_delete_all" on public.clinic_appointments;
create policy "clinic_appointments_delete_all"
on public.clinic_appointments
for delete
to anon, authenticated
using (true);

create table if not exists public.master_directory_items (
  id uuid primary key default gen_random_uuid(),
  directory_type text not null,
  code text,
  name text not null,
  description text,
  price numeric,
  dosage text,
  frequency text,
  duration text,
  instructions text,
  color text,
  icon text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  constraint master_directory_items_type_check
    check (directory_type in (
      'services',
      'medicines',
      'medical_conditions',
      'prescription_templates',
      'tags',
      'tooth_conditions',
      'recall_templates',
      'certificate_templates',
      'clinical_snippets',
      'payment_methods',
      'doctors',
      'appointment_types'
    )),
  constraint master_directory_items_name_not_blank
    check (btrim(name) <> '')
);

create index if not exists master_directory_items_lookup_idx
  on public.master_directory_items (directory_type, archived_at, is_active, sort_order, name);

create unique index if not exists master_directory_items_type_name_active_idx
  on public.master_directory_items (directory_type, lower(name))
  where archived_at is null;

create unique index if not exists master_directory_items_type_code_active_idx
  on public.master_directory_items (directory_type, lower(code))
  where archived_at is null and code is not null;

drop trigger if exists set_master_directory_items_updated_at on public.master_directory_items;
create trigger set_master_directory_items_updated_at
before update on public.master_directory_items
for each row
execute function public.set_updated_at();

alter table public.master_directory_items enable row level security;

drop policy if exists "master_directory_items_select_all" on public.master_directory_items;
create policy "master_directory_items_select_all"
on public.master_directory_items
for select
to anon, authenticated
using (true);

drop policy if exists "master_directory_items_insert_all" on public.master_directory_items;
create policy "master_directory_items_insert_all"
on public.master_directory_items
for insert
to anon, authenticated
with check (true);

drop policy if exists "master_directory_items_update_all" on public.master_directory_items;
create policy "master_directory_items_update_all"
on public.master_directory_items
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "master_directory_items_delete_all" on public.master_directory_items;
create policy "master_directory_items_delete_all"
on public.master_directory_items
for delete
to anon, authenticated
using (true);
