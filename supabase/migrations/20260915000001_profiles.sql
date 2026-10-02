-- DevsAssemble — 0001 profiles
-- Identity foundation: profile per auth user, role-based access, RLS.
-- Apply to a DEDICATED DevsAssemble Supabase project (see build plan).

create extension if not exists citext;

-- Roles are the single source of truth for authorization (used by RLS + DAL).
create type public.user_role as enum ('member', 'moderator', 'admin');

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      citext unique not null,
  display_name  text,
  avatar_url    text,
  bio           text,
  github_username text,
  github_user_id  bigint,
  website_url   text,
  x_url         text,
  linkedin_url  text,
  role          public.user_role not null default 'member',
  is_banned     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Public member profile, 1:1 with auth.users.';

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed a profile whenever a new auth user is created. Pulls GitHub metadata
-- from the OAuth identity payload; falls back to an email-derived username.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := coalesce(
    meta ->> 'user_name',            -- GitHub login
    meta ->> 'preferred_username',
    split_part(new.email, '@', 1),
    'member'
  );
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g'));
  if base_username = '' then
    base_username := 'member';
  end if;

  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url, github_username, github_user_id)
  values (
    new.id,
    final_username,
    coalesce(meta ->> 'full_name', meta ->> 'name', final_username),
    meta ->> 'avatar_url',
    meta ->> 'user_name',
    nullif(meta ->> 'provider_id', '')::bigint
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER, locked search_path).
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'moderator');
$$;

-- ---------------------------------------------------------------------------
-- Prevent privilege escalation: only admins may change role/is_banned.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role
      or new.is_banned is distinct from old.is_banned)
     and not public.is_admin() then
    raise exception 'Not authorized to change role or ban status';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Public read: profiles are public pages.
create policy "profiles_select_public"
  on public.profiles for select
  using (true);

-- Self-update only (role/is_banned still gated by the trigger above).
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admins can update any profile (roles, bans, moderation).
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Note: INSERT happens only via the handle_new_user trigger (security definer),
-- so no INSERT policy is granted to clients.
