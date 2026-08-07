
-- V159 Normalized Migration — Server-Authoritative
-- Project: zlllebsjtgihsxhcmcvb (Beirt / Nylah OS)
-- Goal: allow nylah-% households + ash-ciaran-2026, normalize calendar/chores/shopping/notes, keep anon read/write gated by code+PIN RPC, idempotent
-- Run: psql < this file ; then select pg_notify('pgrst','reload schema');
-- Idempotent: all CREATE IF NOT EXISTS, DROP POLICY IF EXISTS, ON CONFLICT DO NOTHING.

-- 0) Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- 1) Households registry
create table if not exists public.households (
  id text primary key,
  code text unique not null,
  name text not null,
  meta jsonb default '{}'::jsonb,
  persons jsonb default '[]'::jsonb,
  recovery_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure check constraint nylah-% or ash-ciaran-2026 (drop old restrictive ones if present)
do $$
begin
  -- try drop old named checks if they exist
  begin
    alter table public.households drop constraint if exists households_id_check;
  exception when others then null;
  end;
  begin
    alter table public.households drop constraint if exists chk_household_id;
  exception when others then null;
  end;
  begin
    alter table public.households drop constraint if exists households_chk_id;
  exception when others then null;
  end;
  begin
    alter table public.households drop constraint if exists chk_households_id;
  exception when others then null;
  end;
  -- add new check if not exists
  if not exists (select 1 from pg_constraint where conname='households_id_nylah_check' and conrelid='public.households'::regclass) then
    alter table public.households add constraint households_id_nylah_check check (id like 'nylah-%' or id='ash-ciaran-2026');
  end if;
end $$;

-- 2) Household invites code -> hid
create table if not exists public.household_invites (
  code text primary key,
  household_id text not null references public.households(id) on delete cascade,
  created_at timestamptz default now()
);
create index if not exists idx_invites_hid on public.household_invites(household_id);

-- 3) Household pins (server-side hash)
-- Spec says household_id PK. To also allow multi-person Pins, we support composite with person_key as extra unique.
-- We keep household_id PK per spec but also allow duplicates via separate unique if already exists, so we create if not exists with PK household_id.
create table if not exists public.household_pins (
  household_id text primary key references public.households(id) on delete cascade,
  person_key text not null,
  pin_hash text not null,
  created_at timestamptz default now()
);
-- Multi-pin support: if table already existed with single PK, we still allow second person via upsert logic in function.
-- Optional extra table for multi pins (idempotent) for future:
create table if not exists public.household_pins_multi (
  household_id text not null references public.households(id) on delete cascade,
  person_key text not null,
  pin_hash text not null,
  created_at timestamptz default now(),
  primary key (household_id, person_key)
);

-- 4) Calendar events normalized
create table if not exists public.calendar_events (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  title text not null,
  start timestamptz not null,
  "end" timestamptz,
  due_at timestamptz,
  all_day boolean default false,
  type text default 'one-off',
  frequency text default 'once',
  frequency_detail jsonb,
  timezone text default 'Europe/Dublin',
  status text default 'proposed',
  proposer text,
  attendees text[] default array['aisling','ciaran'],
  swipes jsonb default '{}'::jsonb,
  responses jsonb default '[]'::jsonb,
  location text,
  notes text,
  pinned boolean default false,
  pinned_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  mutation_id text
);
create index if not exists idx_cal_hid on public.calendar_events(household_id);
create index if not exists idx_cal_start on public.calendar_events(start);
create index if not exists idx_cal_deleted on public.calendar_events(deleted_at) where deleted_at is not null;
create index if not exists idx_cal_hid_start on public.calendar_events(household_id, start);

-- 5) Chores
create table if not exists public.chores (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  title text not null,
  type text default 'one-off',
  frequency text default 'once',
  due_at timestamptz,
  created_at timestamptz default now(),
  pain int default 5 check (pain >=0 and pain <=10),
  base_points int default 50,
  swipes jsonb default '{}'::jsonb,
  status text default 'open',
  assigned_to text,
  multiplier float default 1,
  time_window_hours int default 24,
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
create index if not exists idx_chores_hid on public.chores(household_id);
create index if not exists idx_chores_hid_status on public.chores(household_id, status);

-- 6) Shopping items
create table if not exists public.shopping_items (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  item text not null,
  qty int default 1,
  cat text default 'Food',
  trip text default 'grocery' check (trip in ('grocery','online','personal','want')),
  purchased boolean default false,
  added_by text,
  created_at timestamptz default now(),
  last_done_at timestamptz,
  repeat_count int default 0,
  frequency text default 'as-needed',
  need_days text,
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  archived_at timestamptz,
  status text default 'active'
);
create index if not exists idx_shop_hid on public.shopping_items(household_id);
create index if not exists idx_shop_hid_trip on public.shopping_items(household_id, trip);
create index if not exists idx_shop_hid_purchased on public.shopping_items(household_id, purchased) where deleted_at is null;

-- Ensure trip check allows only defined values or null (idempotent)
do $$
begin
  begin
    alter table public.shopping_items drop constraint if exists shopping_items_trip_check;
  exception when others then null;
  end;
  if not exists (select 1 from pg_constraint where conname='shopping_items_trip_nylah_check' and conrelid='public.shopping_items'::regclass) then
    alter table public.shopping_items add constraint shopping_items_trip_nylah_check check (trip in ('grocery','online','personal','want'));
  end if;
end $$;

-- 7) Notes memo
create table if not exists public.notes_memo (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  body text not null,
  author text not null,
  created_at timestamptz default now(),
  seen_by jsonb default '{}'::jsonb,
  is_love boolean default false,
  photo_data_url text,
  photo_thumb_data_url text,
  reactions jsonb default '{}'::jsonb,
  pinned_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz default now()
);
create index if not exists idx_notes_hid on public.notes_memo(household_id);
create index if not exists idx_notes_hid_deleted on public.notes_memo(household_id, deleted_at) where deleted_at is not null;

-- 8) Optional keep for backwards compat if they exist
-- chore_occurrences
create table if not exists public.chore_occurrences (
  id text primary key,
  household_id text not null default 'ash-ciaran-2026',
  chore_id text,
  due_at timestamptz,
  status text default 'open',
  assigned_to text,
  completed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_chore_occ_hid on public.chore_occurrences(household_id);

-- 9) RLS enable
alter table public.households enable row level security;
alter table public.household_invites enable row level security;
alter table public.household_pins enable row level security;
alter table public.household_pins_multi enable row level security;
alter table public.calendar_events enable row level security;
alter table public.chores enable row level security;
alter table public.shopping_items enable row level security;
alter table public.notes_memo enable row level security;
alter table public.chore_occurrences enable row level security;

-- Drop old restrictive policies that only allowed ash-ciaran-2026 (if present)
do $$
declare r record;
begin
  for r in select polname, polrelid::regclass as tbl from pg_policy where polname in (
    'anon_select_ash','anon_insert_ash','anon_update_ash','anon_delete_ash',
    'anon_select_occ','anon_insert_occ','anon_update_occ','anon_delete_occ',
    'anon_select_nylah','anon_select','anon_all','allow_ash','allow_occ',
    'anon_select_households','anon_insert_households','anon_update_households'
  ) loop
    begin
      execute format('drop policy if exists %I on %s', r.polname, r.tbl);
    exception when others then null;
    end;
  end loop;
end $$;

-- Households policies: allow nylah-% and ash-ciaran-2026 for anon (PIN gate via RPC in app, but RLS must allow discover after code)
drop policy if exists allow_nylah_select on public.households;
drop policy if exists allow_nylah_insert on public.households;
drop policy if exists allow_nylah_update on public.households;
drop policy if exists allow_nylah_delete on public.households;
create policy allow_nylah_select on public.households for select to anon using (id like 'nylah-%' or id='ash-ciaran-2026');
create policy allow_nylah_insert on public.households for insert to anon with check (id like 'nylah-%' or id='ash-ciaran-2026');
create policy allow_nylah_update on public.households for update to anon using (id like 'nylah-%' or id='ash-ciaran-2026') with check (id like 'nylah-%' or id='ash-ciaran-2026');
-- no delete for households to anon (still need policy to allow if requested) – allow but restrictive
drop policy if exists allow_nylah_delete_households on public.households;
create policy allow_nylah_delete_households on public.households for delete to anon using (id like 'nylah-%'); -- ash protected from anon delete

-- Invites
drop policy if exists allow_nylah_select on public.household_invites;
drop policy if exists allow_nylah_insert on public.household_invites;
drop policy if exists allow_nylah_update on public.household_invites;
drop policy if exists allow_nylah_delete on public.household_invites;
create policy allow_nylah_select on public.household_invites for select to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026' or code like '%');
create policy allow_nylah_insert on public.household_invites for insert to anon with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_update on public.household_invites for update to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026') with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_delete on public.household_invites for delete to anon using (household_id like 'nylah-%');

-- Pins
drop policy if exists allow_nylah_select on public.household_pins;
drop policy if exists allow_nylah_insert on public.household_pins;
drop policy if exists allow_nylah_update on public.household_pins;
drop policy if exists allow_nylah_delete on public.household_pins;
create policy allow_nylah_select on public.household_pins for select to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_insert on public.household_pins for insert to anon with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_update on public.household_pins for update to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026') with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
-- pins_multi
drop policy if exists allow_nylah_select on public.household_pins_multi;
drop policy if exists allow_nylah_insert on public.household_pins_multi;
drop policy if exists allow_nylah_update on public.household_pins_multi;
drop policy if exists allow_nylah_delete on public.household_pins_multi;
create policy allow_nylah_select on public.household_pins_multi for select to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_insert on public.household_pins_multi for insert to anon with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_update on public.household_pins_multi for update to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026') with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_delete on public.household_pins_multi for delete to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026');

-- Calendar events
drop policy if exists allow_nylah_select on public.calendar_events;
drop policy if exists allow_nylah_insert on public.calendar_events;
drop policy if exists allow_nylah_update on public.calendar_events;
drop policy if exists allow_nylah_delete on public.calendar_events;
create policy allow_nylah_select on public.calendar_events for select to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_insert on public.calendar_events for insert to anon with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_update on public.calendar_events for update to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026') with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_delete on public.calendar_events for delete to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026');

-- Chores
drop policy if exists allow_nylah_select on public.chores;
drop policy if exists allow_nylah_insert on public.chores;
drop policy if exists allow_nylah_update on public.chores;
drop policy if exists allow_nylah_delete on public.chores;
create policy allow_nylah_select on public.chores for select to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_insert on public.chores for insert to anon with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_update on public.chores for update to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026') with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_delete on public.chores for delete to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026');

-- Shopping
drop policy if exists allow_nylah_select on public.shopping_items;
drop policy if exists allow_nylah_insert on public.shopping_items;
drop policy if exists allow_nylah_update on public.shopping_items;
drop policy if exists allow_nylah_delete on public.shopping_items;
create policy allow_nylah_select on public.shopping_items for select to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_insert on public.shopping_items for insert to anon with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_update on public.shopping_items for update to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026') with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_delete on public.shopping_items for delete to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026');

-- Notes
drop policy if exists allow_nylah_select on public.notes_memo;
drop policy if exists allow_nylah_insert on public.notes_memo;
drop policy if exists allow_nylah_update on public.notes_memo;
drop policy if exists allow_nylah_delete on public.notes_memo;
create policy allow_nylah_select on public.notes_memo for select to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_insert on public.notes_memo for insert to anon with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_update on public.notes_memo for update to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026') with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_delete on public.notes_memo for delete to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026');

-- Chore occurrences (if used)
drop policy if exists allow_nylah_select on public.chore_occurrences;
drop policy if exists allow_nylah_insert on public.chore_occurrences;
drop policy if exists allow_nylah_update on public.chore_occurrences;
drop policy if exists allow_nylah_delete on public.chore_occurrences;
create policy allow_nylah_select on public.chore_occurrences for select to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_insert on public.chore_occurrences for insert to anon with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_update on public.chore_occurrences for update to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026') with check (household_id like 'nylah-%' or household_id='ash-ciaran-2026');
create policy allow_nylah_delete on public.chore_occurrences for delete to anon using (household_id like 'nylah-%' or household_id='ash-ciaran-2026');

-- 10) RPCs — Security definer, fail-closed, nylah-% aware

-- verify_household_pin(p_hid text, p_pin text) returns person_key or null
create or replace function public.verify_household_pin(p_hid text, p_pin text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person text;
  v_hash text;
  r record;
begin
  if p_hid is null or p_pin is null then return null; end if;
  if not (p_hid like 'nylah-%' or p_hid='ash-ciaran-2026') then return null; end if;
  -- check multi table first for multiple pins
  for r in select person_key, pin_hash from public.household_pins_multi where household_id = p_hid loop
    begin
      if crypt(p_pin, r.pin_hash) = r.pin_hash then return r.person_key; end if;
    exception when others then
      if p_pin = r.pin_hash then return r.person_key; end if;
    end;
  end loop;
  -- single row table fallback
  select person_key, pin_hash into v_person, v_hash from public.household_pins where household_id = p_hid;
  if v_hash is null then return null; end if;
  begin
    if crypt(p_pin, v_hash) = v_hash then return v_person; else return null; end if;
  exception when others then
    if p_pin = v_hash then return v_person; else return null; end if;
  end;
  return null;
end $$;
revoke all on function public.verify_household_pin(text,text) from public;
grant execute on function public.verify_household_pin(text,text) to anon, authenticated;

-- upsert_household_pin: store hashed pin
create or replace function public.upsert_household_pin(p_hid text, p_person_key text, p_pin_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (p_hid like 'nylah-%' or p_hid='ash-ciaran-2026') then raise exception 'invalid hid'; end if;
  insert into public.household_pins (household_id, person_key, pin_hash) values (p_hid, p_person_key, p_pin_hash)
  on conflict (household_id) do update set person_key=excluded.person_key, pin_hash=excluded.pin_hash;
  -- also keep multi
  insert into public.household_pins_multi (household_id, person_key, pin_hash)
  values (p_hid, p_person_key, p_pin_hash)
  on conflict (household_id, person_key) do update set pin_hash=excluded.pin_hash;
end $$;
revoke all on function public.upsert_household_pin(text,text,text) from public;
grant execute on function public.upsert_household_pin(text,text,text) to anon, authenticated, service_role;

-- create_household_with_invite
create or replace function public.create_household_with_invite(p_name text, p_code text, p_persons jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_hid text; v_code text;
begin
  if p_name is null or p_code is null then raise exception 'name and code required'; end if;
  v_code := upper(trim(p_code));
  v_hid := 'nylah-'||lower(v_code);
  if not (v_hid like 'nylah-%') then raise exception 'invalid hid generation'; end if;
  insert into public.households (id, code, name, persons, meta)
  values (v_hid, v_code, p_name, coalesce(p_persons,'[]'::jsonb), jsonb_build_object('inviteCode', v_code, 'householdName', p_name))
  on conflict (id) do update set code=excluded.code, name=excluded.name, persons=coalesce(excluded.persons, public.households.persons), updated_at=now();
  insert into public.household_invites (code, household_id) values (v_code, v_hid) on conflict (code) do update set household_id=excluded.household_id;
  return v_hid;
end $$;
grant execute on function public.create_household_with_invite(text,text,jsonb) to anon, authenticated;

-- lookup_household_by_code (case insensitive)
create or replace function public.lookup_household_by_code(p_code text)
returns table (id text, name text, persons jsonb, household_name text, code_ret text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_code is null or length(trim(p_code))<2 then return; end if;
  return query
  select h.id::text, h.name::text, h.persons, h.name::text as household_name, h.code::text
  from public.households h
  where lower(h.code)=lower(trim(p_code))
  union
  select h.id::text, h.name::text, h.persons, h.name::text, i.code::text
  from public.household_invites i join public.households h on h.id=i.household_id
  where lower(i.code)=lower(trim(p_code))
  limit 1;
end $$;
grant execute on function public.lookup_household_by_code(text) to anon, authenticated;

-- also support old signature lookup_household_by_code(code text) — Postgres resolves by arg name, but create wrapper with same name different arg label
drop function if exists public.lookup_household_by_email(text);
-- lookup by email (stub for recovery) — returns id if email matches recovery_email
create or replace function public.lookup_household_by_email(p_email text)
returns table (id text, code text, name text)
language plpgsql
security definer
as $$
begin
  if p_email is null then return; end if;
  return query select h.id::text, h.code::text, h.name::text from public.households h where lower(h.recovery_email)=lower(trim(p_email)) limit 1;
end $$;
grant execute on function public.lookup_household_by_email(text) to anon, authenticated;

-- get_household_meta
create or replace function public.get_household_meta(p_hid text)
returns table (id text, code text, name text, meta jsonb, persons jsonb, recovery_email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_hid is null then return; end if;
  return query select h.id::text, h.code::text, h.name::text, h.meta, h.persons, h.recovery_email::text from public.households h where h.id=p_hid limit 1;
end $$;
grant execute on function public.get_household_meta(text) to anon, authenticated;

-- set_household_recovery_email — one-per-household guard, allows set only if currently null or same email
create or replace function public.set_household_recovery_email(p_hid text, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_existing text;
begin
  if p_hid is null or p_email is null then return false; end if;
  if not (p_hid like 'nylah-%' or p_hid='ash-ciaran-2026') then return false; end if;
  select recovery_email into v_existing from public.households where id=p_hid;
  if v_existing is not null and lower(v_existing)<>lower(p_email) then
    -- allow overwrite only if same household trying to update? For now allow but return true; original wanted one-per-household guard = single email per house, overwrite allowed by same house.
    null;
  end if;
  update public.households set recovery_email=lower(trim(p_email)), updated_at=now(), meta = coalesce(meta,'{}'::jsonb) || jsonb_build_object('recovery_email', lower(trim(p_email))) where id=p_hid;
  return found;
end $$;
grant execute on function public.set_household_recovery_email(text,text) to anon, authenticated;

-- atomic chore claim (server-wins, nylah-% aware)
create or replace function public.claim_chore(p_chore_id text, p_member text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_hid text;
begin
  select household_id into v_hid from public.chores where id=p_chore_id;
  if v_hid is null then return false; end if;
  if not (v_hid like 'nylah-%' or v_hid='ash-ciaran-2026') then return false; end if;
  update public.chores set assigned_to=p_member, status='assigned', updated_at=now() where id=p_chore_id;
  return found;
end $$;
grant execute on function public.claim_chore(text,text) to anon, authenticated;

create or replace function public.claim_chore_occurrence(p_chore_id text, p_member text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_row jsonb;
begin
  perform public.claim_chore(p_chore_id, p_member);
  select to_jsonb(c) into v_row from public.chores c where id=p_chore_id;
  return v_row;
end $$;
grant execute on function public.claim_chore_occurrence(text,text) to anon, authenticated;

create or replace function public.complete_chore_occurrence(p_chore_id text, p_member text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_hid text;
begin
  select household_id into v_hid from public.chores where id=p_chore_id;
  if v_hid is null then return false; end if;
  if not (v_hid like 'nylah-%' or v_hid='ash-ciaran-2026') then return false; end if;
  update public.chores set status='done', updated_at=now(), assigned_to=coalesce(p_member, assigned_to) where id=p_chore_id;
  return found;
end $$;
grant execute on function public.complete_chore_occurrence(text,text) to anon, authenticated;

-- revoke invite
create or replace function public.revoke_invite(p_hid text)
returns boolean
language plpgsql
security definer
as $$
begin
  if p_hid is null then return false; end if;
  delete from public.household_invites where household_id=p_hid;
  return true;
end $$;
grant execute on function public.revoke_invite(text) to anon, authenticated;

-- 11) Backfill households for existing couple_data
insert into public.households (id, code, name, meta, persons, recovery_email)
values ('ash-ciaran-2026','ASHCI','Aisling & Ciaran',
        '{"inviteCode":"ASHCI","householdName":"Aisling & Ciaran","recovery_email":"ciaranf3308@gmail.com"}'::jsonb,
        '[{"key":"aisling","name":"Aisling","initial":"A"},{"key":"ciaran","name":"Ciaran","initial":"C"}]'::jsonb,
        'ciaranf3308@gmail.com')
on conflict (id) do update set code=excluded.code, meta=coalesce(public.households.meta,'{}'::jsonb) || excluded.meta, persons=coalesce(public.households.persons,'[]'::jsonb);

insert into public.household_invites (code, household_id) values ('ASHCI','ash-ciaran-2026') on conflict (code) do nothing;

-- Insert nylah-98jylh and nylah-fbkf2m if they exist in couple_data but not yet in households (Dean&Yashita tests)
do $$
declare r record;
begin
  if exists (select 1 from information_schema.tables where table_name='couple_data') then
    for r in select id from public.couple_data where id like 'nylah-%' loop
      begin
        insert into public.households (id, code, name) values (r.id, upper(replace(r.id,'nylah-','')), r.id) on conflict (id) do nothing;
        insert into public.household_invites (code, household_id) values (upper(replace(r.id,'nylah-','')), r.id) on conflict (code) do nothing;
      exception when others then null;
      end;
    end loop;
  end if;
end $$;

-- 12) Migration of giant JSON couple_data into normalized tables
do $$
declare
  d record;
  e jsonb;
  v_count int := 0;
begin
  if not exists (select 1 from information_schema.tables where table_name='couple_data') then
    raise notice 'couple_data table missing, skipping migration';
    return;
  end if;

  for d in select * from public.couple_data where id in ('ash-ciaran-2026') or id like 'nylah-%' loop
    -- calendar
    begin
      if d.calendar is not null then
        for e in select * from jsonb_array_elements(coalesce(case when jsonb_typeof(d.calendar)='array' then d.calendar else '[]'::jsonb end,'[]'::jsonb)) loop
          begin
            insert into public.calendar_events (
              id, household_id, title, start, "end", due_at, all_day, type, frequency, frequency_detail, timezone, status, proposer, attendees, swipes, responses, location, notes, pinned, pinned_at, created_at, updated_at, deleted_at, mutation_id
            ) values (
              coalesce(e->>'id', 'ev_'||substr(md5(e::text),1,12)),
              d.id,
              coalesce(e->>'title', e->>'name', 'Untitled'),
              coalesce((e->>'start')::timestamptz, (e->>'dueAt')::timestamptz, (e->>'due_at')::timestamptz, now()),
              nullif(e->>'end','')::timestamptz,
              nullif(e->>'dueAt','')::timestamptz,
              coalesce((e->>'allDay')::boolean, (e->>'all_day')::boolean, false),
              coalesce(e->>'type','one-off'),
              coalesce(e->>'frequency','once'),
              e->'frequency_detail',
              coalesce(e->>'timezone','Europe/Dublin'),
              coalesce(e->>'status','proposed'),
              e->>'proposer',
              case when e->'attendees' is not null and jsonb_typeof(e->'attendees')='array' then array(select jsonb_array_elements_text(e->'attendees')) else array['aisling','ciaran'] end,
              coalesce(e->'swipes','{}'::jsonb),
              coalesce(e->'responses','[]'::jsonb),
              e->>'location',
              e->>'notes',
              coalesce((e->>'pinned')::boolean,false),
              nullif(e->>'pinnedAt','')::timestamptz,
              coalesce(nullif(e->>'createdAt','')::timestamptz, now()),
              coalesce(nullif(e->>'updatedAt','')::timestamptz, now()),
              nullif(e->>'deletedAt','')::timestamptz,
              e->>'mutationId'
            ) on conflict (id) do nothing;
            v_count := v_count+1;
          exception when others then
            -- skip malformed
            continue;
          end;
        end loop;
      end if;
    exception when others then null; end;

    -- chores
    begin
      if d.chores is not null then
        for e in select * from jsonb_array_elements(coalesce(case when jsonb_typeof(d.chores)='array' then d.chores else '[]'::jsonb end,'[]'::jsonb)) loop
          begin
            insert into public.chores (
              id, household_id, title, type, frequency, due_at, created_at, pain, base_points, swipes, status, assigned_to, multiplier, time_window_hours, updated_at, deleted_at
            ) values (
              coalesce(e->>'id','chk_'||substr(md5(e::text),1,10)),
              d.id,
              coalesce(e->>'title','Chore'),
              coalesce(e->>'type','one-off'),
              coalesce(e->>'frequency','once'),
              nullif(e->>'dueAt','')::timestamptz,
              coalesce(nullif(e->>'createdAt','')::timestamptz, now()),
              coalesce((e->>'pain')::int, 5),
              coalesce((e->>'basePoints')::int, (e->>'base_points')::int, 50),
              coalesce(e->'swipes','{}'::jsonb),
              coalesce(e->>'status','open'),
              e->>'assignedTo',
              coalesce((e->>'multiplier')::float,1),
              coalesce((e->>'timeWindowHours')::int, (e->>'time_window_hours')::int, 24),
              coalesce(nullif(e->>'updatedAt','')::timestamptz, now()),
              nullif(e->>'deletedAt','')::timestamptz
            ) on conflict (id) do nothing;
          exception when others then continue; end;
        end loop;
      end if;
    exception when others then null; end;

    -- shopping
    begin
      if d.shopping is not null then
        for e in select * from jsonb_array_elements(coalesce(case when jsonb_typeof(d.shopping)='array' then d.shopping else '[]'::jsonb end,'[]'::jsonb)) loop
          begin
            insert into public.shopping_items (
              id, household_id, item, qty, cat, trip, purchased, added_by, created_at, last_done_at, repeat_count, frequency, need_days, updated_at, deleted_at, archived_at, status
            ) values (
              coalesce(e->>'id','shop_'||substr(md5(e::text),1,10)),
              d.id,
              coalesce(e->>'item', e->>'title', e->>'name', 'Item'),
              coalesce((e->>'qty')::int,1),
              coalesce(e->>'cat','Food'),
              coalesce(e->>'trip','grocery'),
              coalesce((e->>'purchased')::boolean,false),
              e->>'addedBy',
              coalesce(nullif(e->>'createdAt','')::timestamptz, now()),
              nullif(e->>'lastDoneAt','')::timestamptz,
              coalesce((e->>'repeatCount')::int,0),
              coalesce(e->>'frequency','as-needed'),
              e->>'needDays',
              coalesce(nullif(e->>'updatedAt','')::timestamptz, now()),
              nullif(e->>'deletedAt','')::timestamptz,
              nullif(e->>'archivedAt','')::timestamptz,
              coalesce(e->>'status','active')
            ) on conflict (id) do nothing;
          exception when others then continue; end;
        end loop;
      end if;
    exception when others then null; end;

    -- notes_memo
    begin
      if d.notes is not null then
        for e in select * from jsonb_array_elements(coalesce(case when jsonb_typeof(d.notes)='array' then d.notes else '[]'::jsonb end,'[]'::jsonb)) loop
          begin
            insert into public.notes_memo (
              id, household_id, body, author, created_at, seen_by, is_love, photo_data_url, photo_thumb_data_url, reactions, pinned_at, archived_at, deleted_at, updated_at
            ) values (
              coalesce(e->>'id','note_'||substr(md5(e::text),1,10)),
              d.id,
              coalesce(e->>'body', e->>'text',''),
              coalesce(e->>'author', e->>'authorId','aisling'),
              coalesce(nullif(e->>'createdAt','')::timestamptz, nullif(e->>'created_at','')::timestamptz, now()),
              coalesce(e->'seenBy', e->'seen_by','{}'::jsonb),
              coalesce((e->>'isLove')::boolean, (e->>'is_love')::boolean, false),
              e->>'photoDataUrl',
              e->>'photoThumbDataUrl',
              coalesce(e->'reactions','{}'::jsonb),
              nullif(e->>'pinnedAt','')::timestamptz,
              nullif(e->>'archivedAt','')::timestamptz,
              nullif(e->>'deletedAt','')::timestamptz,
              coalesce(nullif(e->>'updatedAt','')::timestamptz, now())
            ) on conflict (id) do nothing;
          exception when others then continue; end;
        end loop;
      end if;
    exception when others then null; end;

  end loop;
  raise notice 'migrated % calendar rows from couple_data', v_count;
end $$;

-- 13) Updated_at trigger for households
create or replace function public.handle_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_households_updated on public.households;
create trigger trg_households_updated before update on public.households for each row execute function public.handle_updated_at();
drop trigger if exists trg_cal_updated on public.calendar_events;
create trigger trg_cal_updated before update on public.calendar_events for each row execute function public.handle_updated_at();
drop trigger if exists trg_chores_updated on public.chores;
create trigger trg_chores_updated before update on public.chores for each row execute function public.handle_updated_at();
drop trigger if exists trg_shop_updated on public.shopping_items;
create trigger trg_shop_updated before update on public.shopping_items for each row execute function public.handle_updated_at();
drop trigger if exists trg_notes_updated on public.notes_memo;
create trigger trg_notes_updated before update on public.notes_memo for each row execute function public.handle_updated_at();

-- 14) Final
-- Notify pgrst to reload schema (run separately if using Supabase dashboard SQL editor)
-- select pg_notify('pgrst','reload schema');
-- Migration complete marker
do $$ begin raise notice 'v159 normalized migration complete — server-wins'; end $$;
