-- DevsAssemble — 0002 events & RSVP
-- Events are the carrot; RSVP is the sign-up funnel. Public read of published
-- events; admins/mods author (admin-only authoring at launch); authenticated
-- members manage their own RSVP. Reuses set_updated_at() + is_admin() from 0001.

create type public.event_status as enum ('draft', 'published', 'cancelled');
create type public.rsvp_status as enum ('going', 'interested');
-- Brand accent for event cards (maps to the comic palette).
create type public.event_accent as enum ('blue', 'lime', 'purple');

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          citext unique not null,
  title         text not null,
  summary       text,                 -- short blurb for cards/listing
  description   text,                 -- long body (plain text / markdown later)
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  timezone      text not null default 'America/New_York',
  location      text,                 -- physical location, or null if virtual
  is_virtual    boolean not null default true,
  host          text,                 -- display label, e.g. 'Live build stream'
  accent        public.event_accent not null default 'blue',
  status        public.event_status not null default 'draft',
  -- Broadcast (Restream, #35). Filled when a live stream is attached.
  is_live          boolean not null default false,
  stream_embed_url text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.events is 'Community events/meetups. Public read when published.';

create index events_starts_at_idx on public.events (starts_at);
create index events_status_starts_at_idx on public.events (status, starts_at);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create table public.rsvps (
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  status     public.rsvp_status not null default 'going',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

comment on table public.rsvps is 'One RSVP per member per event. Public read powers who-is-going + counts.';

create index rsvps_event_idx on public.rsvps (event_id);
create index rsvps_user_idx on public.rsvps (user_id);

create trigger rsvps_set_updated_at
  before update on public.rsvps
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.rsvps  enable row level security;

-- Public reads published + cancelled events (so prior RSVPers see cancellations);
-- admins/mods additionally see drafts.
create policy "events_select_public"
  on public.events for select
  using (status in ('published', 'cancelled') or public.is_admin());

-- Admin-only authoring at launch (create/update/delete).
create policy "events_write_admin"
  on public.events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- RSVPs are publicly readable (counts + who's going).
create policy "rsvps_select_public"
  on public.rsvps for select
  using (true);

-- Members manage only their own RSVP row.
create policy "rsvps_insert_self"
  on public.rsvps for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "rsvps_update_self"
  on public.rsvps for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "rsvps_delete_self"
  on public.rsvps for delete
  to authenticated
  using (user_id = auth.uid());
