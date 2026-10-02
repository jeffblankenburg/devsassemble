-- DevsAssemble — 0003 forum (discussions)
-- Text-only topics + flat replies (markdown bodies, rendered XSS-safe in the app).
-- Permanent URLs: topic.slug is frozen at creation (never regenerated on title
-- edits), so links never break. Public read; authenticated write; author-or-admin
-- edit/delete. Reports feed the moderation queue (#17). Banned-user enforcement
-- is in the DAL (requireUser). Reuses set_updated_at() + is_admin() from 0001.

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        citext unique not null,
  name        text not null,
  description text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

comment on table public.categories is 'Forum categories. Public read; admin-managed.';

insert into public.categories (slug, name, description, position) values
  ('general', 'General', 'Introductions and anything community-related.', 0),
  ('show-your-build', 'Show your build', 'Share what you shipped and how.', 1),
  ('tools-and-strategies', 'Tools & strategies', 'Prompts, agents, and workflows that work.', 2),
  ('help', 'Help', 'Stuck on something? Ask here.', 3);

-- ---------------------------------------------------------------------------
-- Topics
-- ---------------------------------------------------------------------------
create table public.topics (
  id               uuid primary key default gen_random_uuid(),
  slug             citext unique not null,          -- frozen permanent URL segment
  category_id      uuid references public.categories (id) on delete set null,
  author_id        uuid references public.profiles (id) on delete set null,
  title            text not null,
  body             text not null,                   -- markdown
  is_locked        boolean not null default false,
  is_pinned        boolean not null default false,
  reply_count      int not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.topics is 'Discussion topics. Public read; author/admin write. slug is permanent.';

create index topics_category_idx on public.topics (category_id);
create index topics_author_idx on public.topics (author_id);
create index topics_activity_idx on public.topics (last_activity_at desc);

create trigger topics_set_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Posts (replies) — flat; parent_id reserved for future threading.
-- ---------------------------------------------------------------------------
create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  topic_id   uuid not null references public.topics (id) on delete cascade,
  parent_id  uuid references public.posts (id) on delete set null,
  author_id  uuid references public.profiles (id) on delete set null,
  body       text not null,                         -- markdown
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.posts is 'Replies within a topic. Public read; author/admin write.';

create index posts_topic_idx on public.posts (topic_id, created_at);
create index posts_author_idx on public.posts (author_id);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- Keep topics.reply_count + last_activity_at in sync with posts.
create or replace function public.bump_topic_on_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.topics
      set reply_count = reply_count + 1, last_activity_at = now()
      where id = new.topic_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.topics
      set reply_count = greatest(reply_count - 1, 0)
      where id = old.topic_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger posts_bump_topic
  after insert or delete on public.posts
  for each row execute function public.bump_topic_on_post();

-- ---------------------------------------------------------------------------
-- Reports (moderation queue, #17)
-- ---------------------------------------------------------------------------
create type public.report_target as enum ('topic', 'post');
create type public.report_status as enum ('open', 'resolved', 'dismissed');

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references public.profiles (id) on delete set null,
  target_type  public.report_target not null,
  target_id    uuid not null,
  reason       text,
  status       public.report_status not null default 'open',
  resolved_by  uuid references public.profiles (id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

comment on table public.reports is 'User reports of topics/posts. Admin-only read.';

create index reports_status_idx on public.reports (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.topics     enable row level security;
alter table public.posts      enable row level security;
alter table public.reports    enable row level security;

-- Categories: public read; admin write.
create policy "categories_select_public" on public.categories
  for select using (true);
create policy "categories_write_admin" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Topics: public read; author creates own; author or admin edits/deletes.
create policy "topics_select_public" on public.topics
  for select using (true);
create policy "topics_insert_self" on public.topics
  for insert to authenticated with check (author_id = auth.uid());
create policy "topics_update_own_or_admin" on public.topics
  for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
create policy "topics_delete_own_or_admin" on public.topics
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- Posts: public read; author creates own; author or admin edits/deletes.
create policy "posts_select_public" on public.posts
  for select using (true);
create policy "posts_insert_self" on public.posts
  for insert to authenticated with check (author_id = auth.uid());
create policy "posts_update_own_or_admin" on public.posts
  for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
create policy "posts_delete_own_or_admin" on public.posts
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- Reports: reporter creates own; only admins can read/update.
create policy "reports_insert_self" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports_select_admin" on public.reports
  for select to authenticated using (public.is_admin());
create policy "reports_update_admin" on public.reports
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
