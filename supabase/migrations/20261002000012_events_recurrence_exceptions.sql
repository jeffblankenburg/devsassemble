-- Per-occurrence cancellation for recurring events. Stores the LOCAL dates
-- (in the event's timezone) that should be skipped within the series. The
-- website shows them struck-through as "Cancelled"; the iCal feed emits EXDATE.
alter table public.events
  add column recurrence_exceptions date[] not null default '{}';

comment on column public.events.recurrence_exceptions is
  'Local dates (event timezone) to skip within a recurring series. Shown cancelled on site, emitted as EXDATE in the iCal feed.';
