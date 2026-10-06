-- DevsAssemble — 0005 projects board (GitHub repos)
-- Members post repos (their own builds or recommended finds) and react with emoji.
-- Public read; authenticated submit (own); author/admin edit/delete. Reactions are
-- self-managed. Foundation for the evaluations/temperament direction (#5).

create type public.repo_kind as enum ('build', 'recommendation');

create table public.repos (
  id               uuid primary key default gen_random_uuid(),
  owner            text not null,
  name             text not null,
  github_url       text not null,
  description      text,
  homepage_url     text,
  stars            int,
  language         text,
  owner_avatar_url text,
  kind             public.repo_kind not null default 'recommendation',
  note             text,
  submitted_by     uuid references public.profiles (id) on delete set null,
  last_synced_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (owner, name)
);

comment on table public.repos is 'Shared GitHub repos (builds + recommendations). Public read.';

create index repos_created_idx on public.repos (created_at desc);
create index repos_submitted_by_idx on public.repos (submitted_by);

create trigger repos_set_updated_at
  before update on public.repos
  for each row execute function public.set_updated_at();

create table public.repo_reactions (
  repo_id    uuid not null references public.repos (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (repo_id, user_id, emoji)
);

comment on table public.repo_reactions is 'Emoji reactions on repos. One of each emoji per user per repo.';

create index repo_reactions_repo_idx on public.repo_reactions (repo_id);

-- Row Level Security
alter table public.repos          enable row level security;
alter table public.repo_reactions enable row level security;

create policy "repos_select_public" on public.repos
  for select using (true);
create policy "repos_insert_self" on public.repos
  for insert to authenticated with check (submitted_by = auth.uid());
create policy "repos_update_own_or_admin" on public.repos
  for update to authenticated
  using (submitted_by = auth.uid() or public.is_admin())
  with check (submitted_by = auth.uid() or public.is_admin());
create policy "repos_delete_own_or_admin" on public.repos
  for delete to authenticated
  using (submitted_by = auth.uid() or public.is_admin());

create policy "repo_reactions_select_public" on public.repo_reactions
  for select using (true);
create policy "repo_reactions_insert_self" on public.repo_reactions
  for insert to authenticated with check (user_id = auth.uid());
create policy "repo_reactions_delete_self" on public.repo_reactions
  for delete to authenticated using (user_id = auth.uid());
