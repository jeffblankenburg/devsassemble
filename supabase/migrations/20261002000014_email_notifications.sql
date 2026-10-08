-- DevsAssemble — 0014 email notifications
-- Per-category email preferences on profiles, a one-click unsubscribe token,
-- a welcomed_at stamp (so the welcome email sends exactly once), and a dedup
-- ledger for event reminders. Email addresses live in auth.users.email (not
-- here); these columns only govern whether/what we send.

-- ---------------------------------------------------------------------------
-- Preference columns (members opt out per category; defaults ON except nothing
-- marketing). "critical" mail — welcome, suspension, report-resolved — ignores
-- these and always sends.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email_enabled          boolean not null default true,
  add column if not exists notify_event_reminders boolean not null default true,
  add column if not exists notify_event_changes   boolean not null default true,
  add column if not exists notify_forum_replies   boolean not null default true,
  add column if not exists notify_moderation       boolean not null default true,
  add column if not exists welcomed_at             timestamptz,
  add column if not exists unsubscribe_token        uuid not null default gen_random_uuid();

-- Token is the unauthenticated key in one-click unsubscribe links.
create unique index if not exists profiles_unsubscribe_token_idx
  on public.profiles (unsubscribe_token);

-- ---------------------------------------------------------------------------
-- Event reminder dedup — reminders fire per occurrence, so the key is
-- (user, event, occurrence_start), not just (user, event). Written only by the
-- reminder cron (secret-key client, which bypasses RLS); RLS on with no policy
-- keeps it inaccessible to everyone else.
-- ---------------------------------------------------------------------------
create table public.event_reminders_sent (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  event_id         uuid not null references public.events (id) on delete cascade,
  occurrence_start timestamptz not null,
  sent_at          timestamptz not null default now(),
  primary key (user_id, event_id, occurrence_start)
);

comment on table public.event_reminders_sent is
  'One row per reminder already sent, keyed by occurrence so recurring series are not re-reminded.';

alter table public.event_reminders_sent enable row level security;
