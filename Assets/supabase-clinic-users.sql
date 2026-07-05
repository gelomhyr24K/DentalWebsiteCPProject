create extension if not exists pgcrypto;

create table if not exists public.clinic_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  role text not null default 'staff',
  license_no text,
  contact_number text,
  avatar_url text,
  status text not null default 'active',
  settings jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint clinic_users_role_check
    check (role in ('clinic_owner', 'associate_dentist', 'staff')),
  constraint clinic_users_status_check
    check (status in ('active', 'inactive'))
);

drop trigger if exists set_clinic_users_updated_at on public.clinic_users;

create trigger set_clinic_users_updated_at
before update on public.clinic_users
for each row
execute function public.set_updated_at();

alter table public.clinic_users enable row level security;

drop policy if exists "clinic_users_select_all" on public.clinic_users;
create policy "clinic_users_select_all"
on public.clinic_users
for select
to anon, authenticated
using (true);

drop policy if exists "clinic_users_insert_all" on public.clinic_users;
create policy "clinic_users_insert_all"
on public.clinic_users
for insert
to anon, authenticated
with check (true);

drop policy if exists "clinic_users_update_all" on public.clinic_users;
create policy "clinic_users_update_all"
on public.clinic_users
for update
to anon, authenticated
using (true)
with check (true);
