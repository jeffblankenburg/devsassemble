import { RRule } from "rrule";
import type { EventRow } from "./queries";
import { getZonedParts, zonedWallClockToUtcIso } from "./format";

// Recurring events are stored as a SINGLE row: one base `starts_at` plus an
// RFC-5545 RRULE pattern body (`rrule`), an optional end (`recurrence_count` or
// `recurrence_until`), and skipped dates (`recurrence_exceptions`). Calendar
// clients expand the RRULE themselves; the website expands at read time here.
//
// DST handling is the crux: we expand the rule in the event's LOCAL wall-clock
// (so "5:30pm on the 4th Thursday" stays 5:30pm every month), then convert each
// occurrence to a true UTC instant using the zone's offset ON THAT DATE. The
// hour-of-UTC shifts across spring-forward/fall-back; the local time does not.

const DAY_MS = 86_400_000;
const HORIZON_MS = 5 * 365.25 * DAY_MS; // how far ahead to look for "upcoming"

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Local "YYYY-MM-DD" of a UTC instant in the given zone. */
function localDate(iso: string, tz: string): string {
  const p = getZonedParts(iso, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * A UTC instant → a "naive-local" Date whose UTC fields equal the wall-clock
 * parts seen in `tz`. This is the frame rrule expands in.
 */
function naiveLocal(iso: string, tz: string): Date {
  const p = getZonedParts(iso, tz);
  return new Date(
    Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      Number(p.second),
    ),
  );
}

/** A naive-local Date (from rrule) → the true UTC ISO instant in `tz`. */
function naiveToUtcIso(d: Date, tz: string): string {
  const local = `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return zonedWallClockToUtcIso(local, tz) ?? d.toISOString();
}

/** Build the rrule for an event in its naive-local frame, or null if one-off. */
function buildRule(event: EventRow): RRule | null {
  if (!event.rrule) return null;
  const tz = event.timezone;
  try {
    const opts = RRule.parseString(event.rrule);
    opts.dtstart = naiveLocal(event.starts_at, tz);
    if (event.recurrence_count && event.recurrence_count > 0) {
      opts.count = event.recurrence_count;
    }
    if (event.recurrence_until) {
      const [y, m, d] = event.recurrence_until.split("-").map(Number);
      // End of the until-date in the local frame (occurrences are naive-local).
      opts.until = new Date(Date.UTC(y, m - 1, d, 23, 59, 59));
    }
    return new RRule(opts);
  } catch {
    return null; // malformed rule → treat as non-recurring
  }
}

/**
 * Shape a base event into a concrete occurrence. `origDate` is the occurrence's
 * ORIGINAL local date (the key for cancel/move), while `startIso` is its
 * effective instant — which differs from the original when the occurrence was
 * moved. Keying by origDate keeps cancel/move stable across a move.
 */
function materialize(
  event: EventRow,
  startIso: string,
  origDate: string,
  durationMs: number | null,
): EventRow {
  const startMs = new Date(startIso).getTime();
  const cancelled =
    event.status === "cancelled" ||
    event.recurrence_exceptions.includes(origDate);
  return {
    ...event,
    starts_at: startIso,
    ends_at: durationMs != null ? new Date(startMs + durationMs).toISOString() : null,
    status: cancelled ? "cancelled" : event.status,
    occurrenceKey: `${event.id}-${origDate}`,
  };
}

/** Map of original-date → moved instant for an event's overrides. */
function overrideMap(event: EventRow): Map<string, string> {
  return new Map(event.recurrence_overrides.map((o) => [o.date, o.starts_at]));
}

function durationOf(event: EventRow): number | null {
  return event.ends_at
    ? new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()
    : null;
}

/**
 * The next up-to-`count` occurrences at or after `now`. Cancelled (skipped)
 * dates are included and flagged, so they show struck-through and still count
 * toward the window.
 */
export function upcomingOccurrences(
  event: EventRow,
  now: Date,
  count: number,
): EventRow[] {
  const tz = event.timezone;
  const durationMs = durationOf(event);
  const nowMs = now.getTime();

  const rule = buildRule(event);
  if (!rule) {
    return new Date(event.starts_at).getTime() >= nowMs
      ? [materialize(event, event.starts_at, localDate(event.starts_at, tz), durationMs)]
      : [];
  }

  const overrides = overrideMap(event);
  const nowLocal = naiveLocal(now.toISOString(), tz);
  const horizon = new Date(nowLocal.getTime() + HORIZON_MS);

  // Apply moves, then re-sort by effective start (a move changes the order) and
  // keep only still-upcoming instances.
  return rule
    .between(nowLocal, horizon, true)
    .map((d) => {
      const origIso = naiveToUtcIso(d, tz);
      const origDate = localDate(origIso, tz);
      const startIso = overrides.get(origDate) ?? origIso;
      return materialize(event, startIso, origDate, durationMs);
    })
    .filter((r) => new Date(r.starts_at).getTime() >= nowMs)
    .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1))
    .slice(0, count);
}

/** The most recent occurrence before `now`, or null if the series is still active. */
export function latestPastOccurrence(event: EventRow, now: Date): EventRow | null {
  const tz = event.timezone;
  const durationMs = durationOf(event);

  // A series with any upcoming occurrence is never "past".
  if (upcomingOccurrences(event, now, 1).length > 0) return null;

  const rule = buildRule(event);
  if (!rule) {
    return new Date(event.starts_at).getTime() < now.getTime()
      ? materialize(event, event.starts_at, localDate(event.starts_at, tz), durationMs)
      : null;
  }

  const last = rule.before(naiveLocal(now.toISOString(), tz), true);
  if (!last) return null;
  const origIso = naiveToUtcIso(last, tz);
  const origDate = localDate(origIso, tz);
  const startIso = overrideMap(event).get(origDate) ?? origIso;
  return materialize(event, startIso, origDate, durationMs);
}

export type OccurrenceSlot = {
  date: string; // original local date (the key)
  iso: string; // original instant
  cancelled: boolean;
  movedToIso: string | null; // effective instant if moved, else null
};

/** Upcoming occurrence dates for the admin skip/restore/move UI. */
export function listOccurrenceSlots(
  event: EventRow,
  now: Date,
  count: number,
): OccurrenceSlot[] {
  const tz = event.timezone;
  const rule = buildRule(event);
  if (!rule) return [];

  const overrides = overrideMap(event);
  const nowLocal = naiveLocal(now.toISOString(), tz);
  const horizon = new Date(nowLocal.getTime() + HORIZON_MS);
  return rule
    .between(nowLocal, horizon, true)
    .slice(0, count)
    .map((d) => {
      const iso = naiveToUtcIso(d, tz);
      const date = localDate(iso, tz);
      return {
        date,
        iso,
        cancelled: event.recurrence_exceptions.includes(date),
        movedToIso: overrides.get(date) ?? null,
      };
    });
}
