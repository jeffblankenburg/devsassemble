-- Migrate event timestamps from wall-clock-interpreted-as-UTC to true UTC.
--
-- Previously, an event's local wall-clock was stored as if it were UTC (e.g.
-- 5:30 PM ET was stored as 17:30Z). We now store true UTC instants and convert
-- to each event's `timezone` for display. This reinterprets existing values:
-- read the stored digits as a naive wall-clock, then anchor them in the event's
-- timezone to produce the correct instant (5:30 PM ET -> 21:30Z).
--
-- Run ONCE. `timezone` is NOT NULL (default America/New_York), so every row
-- converts deterministically. `recurrence_until` is a date and is left as-is.

update public.events
set
  starts_at = (starts_at at time zone 'UTC') at time zone timezone,
  ends_at = case
    when ends_at is not null
      then (ends_at at time zone 'UTC') at time zone timezone
    else null
  end;
