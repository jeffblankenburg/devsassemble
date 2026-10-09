-- DevsAssemble — 0024 news ingest (IFTTT → tweet pipeline)
-- Reddit blocks server-side API/RSS access, so instead IFTTT (which has real
-- Reddit access) pushes top posts to our ingest endpoint, which stores them
-- here. The tweet drafter reads recent rows alongside its HN + Dev.to fetches.
-- Generic by design — any IFTTT source can post to the same endpoint.
-- Written only by the token-guarded endpoint (secret-key client); RLS on with
-- no policy keeps it inaccessible to everyone else.

create table public.news_ingest (
  id         uuid primary key default gen_random_uuid(),
  source     text not null,          -- e.g. "r/MachineLearning"
  title      text not null,
  url        text not null unique,   -- dedup on URL
  created_at timestamptz not null default now()
);

create index news_ingest_created_idx on public.news_ingest (created_at desc);

alter table public.news_ingest enable row level security;
