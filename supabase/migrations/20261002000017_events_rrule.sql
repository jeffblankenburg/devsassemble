-- DevsAssemble — 0017 events RRULE
-- Replace the coarse recurrence enum with a real RFC-5545 RRULE as the source of
-- truth, so scheduling can match Outlook/Google: intervals, by-weekday, monthly
-- nth/last weekday, yearly, and end-after-N. The rule body holds only the
-- PATTERN (FREQ/INTERVAL/BY*). The end is kept in the event's own fields —
-- recurrence_until (date) and the new recurrence_count — so the stored UTC/local
-- frames never clash (the app expands in local wall-clock and converts to UTC
-- per occurrence, holding time-of-day fixed across DST).
--
-- Occurrence start times stay as the single base `starts_at`; `rrule` null means
-- a one-off. The legacy `recurrence`/`recurrence_until` columns remain (still
-- read by the iCal/until logic); `recurrence` is no longer authoritative.

alter table public.events
  add column if not exists rrule            text,
  add column if not exists recurrence_count int;

-- Backfill an equivalent RRULE for existing recurring rows. Monthly used the
-- start's day-of-month, computed here in the event's own timezone.
update public.events
set rrule = case recurrence
  when 'daily'    then 'FREQ=DAILY'
  when 'weekly'   then 'FREQ=WEEKLY'
  when 'biweekly' then 'FREQ=WEEKLY;INTERVAL=2'
  when 'monthly'  then 'FREQ=MONTHLY;BYMONTHDAY=' ||
                       extract(day from (starts_at at time zone timezone))::int
  else null
end
where recurrence is distinct from 'none';
