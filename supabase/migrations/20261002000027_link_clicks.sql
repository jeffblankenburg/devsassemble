-- DevsAssemble — 0027 link click tracking
-- Monitor clickthroughs on link-preview cards (the shared articles/videos). The
-- /l/[id] redirect route records one row per outbound click, then 302s to the
-- vetted URL stored on the link_previews row (id-keyed, so it's NOT an open
-- redirect). Writes are service-key only; admins read via the DAL. A maintained
-- click_count on link_previews mirrors the topics.reply_count trigger pattern so
-- the "top content" view is a cheap ordered scan. Privacy: we store the link,
-- the source discussion, and the signed-in user id (null for anonymous) — no IP,
-- no raw user-agent.

alter table public.link_previews
  add column click_count integer not null default 0;

create table public.link_clicks (
  id              uuid primary key default gen_random_uuid(),
  link_preview_id uuid not null references public.link_previews (id) on delete cascade,
  topic_id        uuid references public.topics (id) on delete set null,
  user_id         uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

comment on table public.link_clicks is
  'One row per outbound click on a link-preview card. Service-key writes only (recorded by the /l/[id] redirect route); admins read via the DAL. RLS on with no policy.';

create index link_clicks_preview_idx on public.link_clicks (link_preview_id);
create index link_clicks_created_idx on public.link_clicks (created_at desc);

alter table public.link_clicks enable row level security;
-- No policies: service-only (mirrors feedback/tweets). RLS blocks anon/authenticated.

-- Keep link_previews.click_count in sync. Clicks are never deleted, so insert
-- only. security definer + empty search_path matches bump_topic_on_post().
create or replace function public.bump_link_click_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.link_previews
    set click_count = click_count + 1
    where id = new.link_preview_id;
  return new;
end;
$$;

create trigger link_clicks_bump_count
  after insert on public.link_clicks
  for each row execute function public.bump_link_click_count();

-- The trigger helper only makes sense inside a trigger context — keep it off the
-- PostgREST RPC surface (matches 0004's hardening of bump_topic_on_post, clears
-- the security-definer advisor warning).
revoke execute on function public.bump_link_click_count() from anon, authenticated, public;
