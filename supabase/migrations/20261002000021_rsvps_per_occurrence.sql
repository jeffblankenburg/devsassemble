-- DevsAssemble — 0021 per-occurrence RSVPs
-- RSVPs were keyed by (event_id, user_id), so RSVPing a recurring series marked
-- EVERY occurrence. Add the occurrence's start to the key so each date is
-- independent. For one-off events there's a single occurrence = the event's
-- starts_at. Existing RSVPs are backfilled to the event's base start.

alter table public.rsvps add column if not exists occurrence_start timestamptz;

update public.rsvps r
set occurrence_start = e.starts_at
from public.events e
where e.id = r.event_id and r.occurrence_start is null;

alter table public.rsvps alter column occurrence_start set not null;

alter table public.rsvps drop constraint rsvps_pkey;
alter table public.rsvps
  add constraint rsvps_pkey primary key (event_id, user_id, occurrence_start);
