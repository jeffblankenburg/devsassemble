-- DevsAssemble — 0023 scheduled tweets
-- Approve a tweet to post at a future time instead of immediately. A
-- `scheduled` row carries its finalized body + `scheduled_for`; a cron publishes
-- due ones (cross-posting to X + Bluesky) and flips them to `posted`.

alter type public.tweet_status add value if not exists 'scheduled';

alter table public.tweets
  add column if not exists scheduled_for timestamptz;

create index if not exists tweets_scheduled_idx
  on public.tweets (scheduled_for)
  where status = 'scheduled';
