-- DevsAssemble — 0006 events: virtual URL + recurrence
-- url: where attendees join a virtual event (distinct from the Restream embed).
-- recurrence: repeat rule for a series (iCal RRULE + future next-occurrence calc).

create type public.recurrence_freq as enum (
  'none', 'daily', 'weekly', 'biweekly', 'monthly'
);

alter table public.events
  add column url text,
  add column recurrence public.recurrence_freq not null default 'none';
