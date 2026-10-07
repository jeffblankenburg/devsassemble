-- DevsAssemble — 0007 events: recurrence end date
-- Optional "repeat until" for recurring series. Null = repeats indefinitely.
-- Maps to iCal RRULE;UNTIL so the series cleanly stops in subscribers' calendars.

alter table public.events
  add column recurrence_until date;
