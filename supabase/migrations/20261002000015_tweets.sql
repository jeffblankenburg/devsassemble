-- DevsAssemble — 0015 tweets (daily @devsassembleAI draft/approve/post queue)
-- Claude drafts options each day; an admin reviews, edits, and posts the chosen
-- one to X. This table is the review queue AND the posted history (dedup). Only
-- touched by admin-gated server code via the secret-key client, so RLS is on
-- with no policy — inaccessible to anon/authenticated, bypassed by the cron.

create type public.tweet_status as enum ('draft', 'posted', 'rejected');

create table public.tweets (
  id              uuid primary key default gen_random_uuid(),
  status          public.tweet_status not null default 'draft',
  kind            text not null,                        -- event/tool/discussion/project/evergreen/news
  body            text not null,                        -- the chosen/edited tweet (<=280)
  source_url      text,                                 -- link included in the tweet
  rationale       text,                                 -- why Claude suggested this
  alternatives    jsonb not null default '[]'::jsonb,   -- the other generated options
  created_for     date not null default current_date,   -- the day this draft targets
  approved_by     uuid references public.profiles (id) on delete set null,
  posted_tweet_id text,                                 -- X status id once posted
  posted_url      text,
  posted_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.tweets is
  'Daily tweet draft/approve/post queue for @devsassembleAI. Admin-managed via secret-key client; RLS on with no policy.';

create index tweets_status_idx on public.tweets (status, created_at desc);

create trigger tweets_set_updated_at
  before update on public.tweets
  for each row execute function public.set_updated_at();

alter table public.tweets enable row level security;
