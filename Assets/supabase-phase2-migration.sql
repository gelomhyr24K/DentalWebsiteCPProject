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
