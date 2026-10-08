-- DevsAssemble — 0013 forum images (inline uploads for discussions)
-- A dedicated public bucket for images embedded in topic/reply markdown, plus a
-- tracking table that lets us reclaim ABANDONED uploads: a file that gets
-- uploaded from the composer but whose post is never submitted. Every upload
-- records a row (committed = false); creating a topic/reply flips the referenced
-- rows to committed = true; a daily cron sweeps uncommitted rows older than a
-- grace window and deletes the orphaned storage objects.
-- Public read; authenticated users write/manage only their own uid/ folder.

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('forum-images', 'forum-images', true)
on conflict (id) do nothing;

create policy "forum_images_public_read"
  on storage.objects for select
  using (bucket_id = 'forum-images');

create policy "forum_images_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "forum_images_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "forum_images_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Upload ledger (abandonment tracking)
-- ---------------------------------------------------------------------------
create table public.forum_uploads (
  id         uuid primary key default gen_random_uuid(),
  path       text unique not null,                 -- object name within the bucket (uid/file)
  url        text not null,                         -- public URL embedded in markdown
  author_id  uuid not null references public.profiles (id) on delete cascade,
  committed  boolean not null default false,        -- true once referenced by a posted topic/reply
  created_at timestamptz not null default now()
);

comment on table public.forum_uploads is
  'Ledger of forum image uploads. committed=false rows past the grace window are abandoned and swept by cron.';

-- Partial index: the sweep only ever scans uncommitted rows.
create index forum_uploads_pending_idx
  on public.forum_uploads (created_at)
  where not committed;

alter table public.forum_uploads enable row level security;

-- Author manages their own ledger rows. The cron sweep uses the secret-key
-- client, which bypasses RLS, so it needs no policy here.
create policy "forum_uploads_insert_own"
  on public.forum_uploads for insert to authenticated
  with check (author_id = auth.uid());

create policy "forum_uploads_select_own"
  on public.forum_uploads for select to authenticated
  using (author_id = auth.uid());

create policy "forum_uploads_update_own"
  on public.forum_uploads for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
