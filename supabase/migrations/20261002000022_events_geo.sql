-- DevsAssemble — 0022 event coordinates (for "near me")
-- Geocoded lat/lng for in-person events, so the events page can filter by
-- distance from a visitor's location. Populated best-effort from the `location`
-- text on save (OpenStreetMap Nominatim); null when virtual or not yet geocoded.

alter table public.events
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision;
