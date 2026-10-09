-- DevsAssemble — 0016 tweets: Bluesky cross-post columns
-- Posts now cross-post to X and Bluesky. X ids/urls already exist on the row;
-- add the Bluesky post URI (at://...) and its web URL. A row is `posted` once at
-- least one platform succeeds; a null column means that platform wasn't posted
-- (not selected, or it failed).

alter table public.tweets
  add column if not exists bluesky_uri text,
  add column if not exists bluesky_url text;
