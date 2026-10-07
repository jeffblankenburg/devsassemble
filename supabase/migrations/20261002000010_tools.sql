-- DevsAssemble — 0010 tools shelf
-- A toolbelt of useful tools/services members recommend. Unlike projects (which
-- are GitHub repos), a tool is just a URL + category — no repo required.
-- Public read; authenticated submit (own); author/admin edit/delete. Reactions
-- mirror repo_reactions (self-managed, one of each emoji per user per tool).

create type public.tool_category as enum (
  'ai', 'devops', 'design', 'productivity', 'other'
);

create table public.tools (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  url          text not null,
  description  text,
  category     public.tool_category not null default 'other',
  submitted_by uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (url)
);

comment on table public.tools is 'Member-recommended tools/services (any URL). Public read.';

create index tools_created_idx on public.tools (created_at desc);
create index tools_category_idx on public.tools (category);
create index tools_submitted_by_idx on public.tools (submitted_by);

create trigger tools_set_updated_at
  before update on public.tools
  for each row execute function public.set_updated_at();

create table public.tool_reactions (
  tool_id    uuid not null references public.tools (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (tool_id, user_id, emoji)
);

comment on table public.tool_reactions is 'Emoji reactions on tools. One of each emoji per user per tool.';

create index tool_reactions_tool_idx on public.tool_reactions (tool_id);

-- Row Level Security
alter table public.tools          enable row level security;
alter table public.tool_reactions enable row level security;

create policy "tools_select_public" on public.tools
  for select using (true);
create policy "tools_insert_self" on public.tools
  for insert to authenticated with check (submitted_by = auth.uid());
create policy "tools_update_own_or_admin" on public.tools
  for update to authenticated
  using (submitted_by = auth.uid() or public.is_admin())
  with check (submitted_by = auth.uid() or public.is_admin());
create policy "tools_delete_own_or_admin" on public.tools
  for delete to authenticated
  using (submitted_by = auth.uid() or public.is_admin());

create policy "tool_reactions_select_public" on public.tool_reactions
  for select using (true);
create policy "tool_reactions_insert_self" on public.tool_reactions
  for insert to authenticated with check (user_id = auth.uid());
create policy "tool_reactions_delete_self" on public.tool_reactions
  for delete to authenticated using (user_id = auth.uid());
