-- DevsAssemble — 0019 external RSVP URL
-- Some organizers manage registration/RSVP (and speaker details, tickets, etc.)
-- on their own site. When `rsvp_url` is set, the event page points attendees
-- there to register instead of using our native "going" RSVP; members can still
-- mark themselves "interested" here (for reminders + visibility).
-- Distinct from `url` (the join/stream link for attending).

alter table public.events
  add column if not exists rsvp_url text;
