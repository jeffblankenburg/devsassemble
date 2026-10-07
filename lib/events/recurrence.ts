import type { EventRow, RecurrenceFreq } from "./queries";
import { getZonedParts, zonedWallClockToUtcIso } from "./format";

// Recurring events are stored as a SINGLE row (one base `starts_at` + an RRULE).
// Calendar clients expand the RRULE themselves; the website doesn't, so we
// expand occurrences at read time here. Occurrences preserve the event's LOCAL
// wall-clock across DST (like the iCal feed's TZID), and dates listed in
// `recurrence_exceptions` are surfaced as cancelled rather than dropped.

const DAY_MS = 86_400_000;

const NOMINAL_DAYS: Record<RecurrenceFreq, number> = {
  none: 0,
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Local "YYYY-MM-DD" of a UTC instant in the given zone. */
function localDate(iso: string, tz: string): string {
  const p = getZonedParts(iso, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * The start of the `step`-th occurrence (step 0 = the base event), as a true
 * UTC ISO string, holding the event's local time-of-day fixed across DST.
 */
function occurrenceStart(
  baseIso: string,
  tz: string,
  freq: RecurrenceFreq,
  step: number,
): string {
  const p = getZonedParts(baseIso, tz);
  let y = Number(p.year);
  let mo = Number(p.month);
  let d = Number(p.day);

  if (freq === "monthly") {
    const dt = new Date(Date.UTC(y, mo - 1 + step, d));
    y = dt.getUTCFullYear();
    mo = dt.getUTCMonth() + 1;
    d = dt.getUTCDate();
  } else {
    const dt = new Date(Date.UTC(y, mo - 1, d) + step * NOMINAL_DAYS[freq] * DAY_MS);
    y = dt.getUTCFullYear();
    mo = dt.getUTCMonth() + 1;
    d = dt.getUTCDate();
  }

  const local = `${pad(y, 4)}-${pad(mo)}-${pad(d)}T${p.hour}:${p.minute}:${p.second}`;
  return zonedWallClockToUtcIso(local, tz) ?? baseIso;
}

/** End-of-day instant (ms) for a recurrence_until date, in the event's zone. */
function untilMs(untilDate: string, tz: string): number {
  const iso = zonedWallClockToUtcIso(`${untilDate}T23:59:59`, tz);
  return iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY;
}

/** Shape a base event into a concrete occurrence (unique key, cancelled flag). */
function materialize(
  event: EventRow,
  startIso: string,
  tz: string,
  durationMs: number | null,
): EventRow {
  const startMs = new Date(startIso).getTime();
  const cancelled =
    event.status === "cancelled" ||
    event.recurrence_exceptions.includes(localDate(startIso, tz));
  return {
    ...event,
    starts_at: startIso,
    ends_at: durationMs != null ? new Date(startMs + durationMs).toISOString() : null,
    status: cancelled ? "cancelled" : event.status,
    occurrenceKey: `${event.id}-${startIso}`,
  };
}

/**
 * The next up-to-`count` occurrences of an event at or after `now`. Cancelled
 * (skipped) dates are included and flagged, so they show struck-through and
 * still count toward the window — matching the chronological "next two".
 */
export function upcomingOccurrences(
  event: EventRow,
  now: Date,
  count: number,
): EventRow[] {
  const tz = event.timezone;
  const nowMs = now.getTime();
  const durationMs = event.ends_at
    ? new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()
    : null;

  if (event.recurrence === "none") {
    return new Date(event.starts_at).getTime() >= nowMs
      ? [materialize(event, event.starts_at, tz, durationMs)]
      : [];
  }

  const baseMs = new Date(event.starts_at).getTime();
  const until = event.recurrence_until ? untilMs(event.recurrence_until, tz) : null;
  // Skip ahead near `now` so long-running series don't loop from the start.
  let step = Math.max(
    0,
    Math.floor((nowMs - baseMs) / (NOMINAL_DAYS[event.recurrence] * DAY_MS)) - 2,
  );

  const out: EventRow[] = [];
  for (let guard = 0; guard < 800 && out.length < count; guard++, step++) {
    const iso = occurrenceStart(event.starts_at, tz, event.recurrence, step);
    const ms = new Date(iso).getTime();
    if (ms < nowMs) continue;
    if (until != null && ms > until) break;
    out.push(materialize(event, iso, tz, durationMs));
  }
  return out;
}

/** The most recent occurrence strictly before `now`, or null if none / still active. */
export function latestPastOccurrence(event: EventRow, now: Date): EventRow | null {
  const tz = event.timezone;
  const nowMs = now.getTime();
  const durationMs = event.ends_at
    ? new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()
    : null;

  if (event.recurrence === "none") {
    return new Date(event.starts_at).getTime() < nowMs
      ? materialize(event, event.starts_at, tz, durationMs)
      : null;
  }

  // An open-ended series always has a future occurrence, so it's never "past".
  const until = event.recurrence_until ? untilMs(event.recurrence_until, tz) : null;
  if (until == null || until >= nowMs) return null;

  const baseMs = new Date(event.starts_at).getTime();
  let step = Math.max(
    0,
    Math.floor((until - baseMs) / (NOMINAL_DAYS[event.recurrence] * DAY_MS)) - 2,
  );
  let last: EventRow | null = null;
  for (let guard = 0; guard < 800; guard++, step++) {
    const iso = occurrenceStart(event.starts_at, tz, event.recurrence, step);
    const ms = new Date(iso).getTime();
    if (ms > until) break;
    if (ms < nowMs) last = materialize(event, iso, tz, durationMs);
  }
  return last;
}

export type OccurrenceSlot = { date: string; iso: string; cancelled: boolean };

/** Upcoming occurrence dates for the admin skip/restore UI. */
export function listOccurrenceSlots(
  event: EventRow,
  now: Date,
  count: number,
): OccurrenceSlot[] {
  if (event.recurrence === "none") return [];
  const tz = event.timezone;
  const nowMs = now.getTime();
  const baseMs = new Date(event.starts_at).getTime();
  const until = event.recurrence_until ? untilMs(event.recurrence_until, tz) : null;
  let step = Math.max(
    0,
    Math.floor((nowMs - baseMs) / (NOMINAL_DAYS[event.recurrence] * DAY_MS)) - 2,
  );

  const out: OccurrenceSlot[] = [];
  for (let guard = 0; guard < 800 && out.length < count; guard++, step++) {
    const iso = occurrenceStart(event.starts_at, tz, event.recurrence, step);
    const ms = new Date(iso).getTime();
    if (ms < nowMs) continue;
    if (until != null && ms > until) break;
    const date = localDate(iso, tz);
    out.push({ date, iso, cancelled: event.recurrence_exceptions.includes(date) });
  }
  return out;
}
