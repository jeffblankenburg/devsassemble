-- DevsAssemble — 0009 avatar studio
-- base_avatar_url = the member's real photo (GitHub or uploaded).
-- hero_avatar_url = generated superhero version.
-- avatar_preference = which one is displayed (synced into avatar_url by the app).
-- hero_generated_at = for the once-per-week generation limit.

alter table public.profiles
  add column base_avatar_url  text,
  add column hero_avatar_url  text,
  add column avatar_preference text not null default 'base'
    check (avatar_preference in ('base', 'hero')),
  add column hero_generated_at timestamptz;

-- Existing rows: the current avatar is their base photo.
update public.profiles set base_avatar_url = avatar_url where base_avatar_url is null;

-- New GitHub signups: seed base_avatar_url alongside avatar_url.
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
    meta ->> 'user_name',
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

  insert into public.profiles (
    id, username, display_name, avatar_url, base_avatar_url,
    github_username, github_user_id
  )
  values (
    new.id,
    final_username,
    coalesce(meta ->> 'full_name', meta ->> 'name', final_username),
    meta ->> 'avatar_url',
    meta ->> 'avatar_url',
    meta ->> 'user_name',
    nullif(meta ->> 'provider_id', '')::bigint
  );
  return new;
end;
$$;
