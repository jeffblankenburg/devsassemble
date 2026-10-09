-- DevsAssemble — 0018 single-occurrence overrides
-- Lets an admin move one occurrence of a recurring series to a different
-- date/time (e.g. shift the pre-Christmas meetup a week earlier) without
-- affecting the rest. Mirrors how recurrence_exceptions (cancel) rides on the
-- event as data the expander reads. Each override is keyed by the ORIGINAL
-- local date of the occurrence it replaces:
--   [{ "date": "2026-12-23", "starts_at": "2026-12-16T22:30:00.000Z" }]
-- The moved occurrence keeps the event's duration. In iCal this emits a
-- RECURRENCE-ID override VEVENT.

alter table public.events
  add column if not exists recurrence_overrides jsonb not null default '[]'::jsonb;
