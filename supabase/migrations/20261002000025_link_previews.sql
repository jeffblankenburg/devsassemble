-- DevsAssemble — 0025 link previews (unfurled cards for discussion links)
-- When a member pastes a bare URL on its own line in a topic/reply, a cron-free
-- background job (next/after) fetches the page through the SSRF-safe fetcher and
-- caches the resolved Open Graph / oEmbed metadata here, keyed by normalized
-- URL. The discussion UI reads from this cache — a cache miss renders a plain
-- link until the row lands. The preview image is re-hosted into a dedicated
-- bucket (never hot-linked), so image_path is this row's own cleanup ledger.
-- Public read (all content is public); writes only via the service-key client.
-- Reuses set_updated_at() from 0001.

-- ---------------------------------------------------------------------------
-- Cache table
-- ---------------------------------------------------------------------------
create table public.link_previews (
  id          uuid primary key default gen_random_uuid(),
  url         text unique not null,                  -- normalized source URL (the cache key)
  status      text not null default 'pending'
                check (status in ('pending', 'ok', 'error')),
  kind        text not null default 'link'
                check (kind in ('link', 'article', 'video')),
  provider    text,                                   -- 'opengraph' | 'youtube' | ...
  title       text,
  description text,
  site_name   text,
  author      text,                                   -- channel/byline (video author, etc.)
  image_url   text,                                   -- our re-hosted public image URL
  image_path  text,                                   -- object path in link-preview-images (cleanup ledger)
  error       text,                                   -- last failure reason when status = 'error'
  fetched_at  timestamptz,                            -- when metadata was last resolved
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.link_previews is
  'Cache of unfurled link metadata keyed by normalized URL. Populated by a background job after a post is created; read by the discussion UI.';

create trigger link_previews_set_updated_at
  before update on public.link_previews
  for each row execute function public.set_updated_at();

-- The sweep refreshes the oldest-resolved rows; this index serves that scan.
create index link_previews_fetched_at_idx
  on public.link_previews (fetched_at);

alter table public.link_previews enable row level security;

-- Public read: previews decorate public discussion content.
create policy "link_previews_public_read"
  on public.link_previews for select
  using (true);

-- No insert/update/delete policies: unfurling is server-only and runs through
-- the secret-key client, which bypasses RLS. This keeps members from writing
-- arbitrary preview rows (which would otherwise be a self-XSS / spoofing vector).

-- ---------------------------------------------------------------------------
-- Storage bucket for re-hosted preview images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('link-preview-images', 'link-preview-images', true)
on conflict (id) do nothing;

create policy "link_preview_images_public_read"
  on storage.objects for select
  using (bucket_id = 'link-preview-images');

-- No member write policies: images are downloaded + uploaded exclusively by the
-- service-key client during unfurling, which bypasses RLS.
