// Event date/time handling.
//
// Times are stored as true UTC instants (timestamptz). Each event also carries
// an IANA `timezone` (e.g. "America/New_York"); the admin picks a wall-clock
// time in that zone, we convert to UTC for storage, and convert back to that
// zone for display, the edit form, and the iCal feed. Conversion uses Intl
// (no TZ library) and is DST-safe.

const TZ_LABELS: Record<string, string> = {
  "America/New_York": "ET",
  "America/Chicago": "CT",
  "America/Denver": "MT",
  "America/Los_Angeles": "PT",
  "Europe/London": "GMT",
  "Europe/Berlin": "CET",
  UTC: "UTC",
};

export const DEFAULT_TIMEZONE = "America/New_York";

export function tzLabel(tz?: string | null): string {
  if (!tz) return "";
  return TZ_LABELS[tz] ?? tz;
}

/** The wall-clock parts of a UTC instant, as seen in `timeZone`. */
export function getZonedParts(iso: string, timeZone: string): Record<string, string> {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const out: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(iso))) {
    if (p.type !== "literal") out[p.type] = p.value;
  }
  return out;
}

/** Offset (zone − UTC) in milliseconds at a given instant. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = getZonedParts(instant.toISOString(), timeZone);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUtc - instant.getTime();
}

/**
 * A wall-clock value ("YYYY-MM-DDTHH:mm", seconds optional) interpreted in
 * `timeZone` → the true UTC instant as an ISO string. DST-safe: the offset is
 * resolved at the candidate instant, then refined once across transitions.
 */
export function zonedWallClockToUtcIso(
  local: string,
  timeZone: string,
): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const naive = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    s ? Number(s) : 0,
  );
  const off = zoneOffsetMs(new Date(naive), timeZone);
  let utc = naive - off;
  const off2 = zoneOffsetMs(new Date(utc), timeZone);
  if (off2 !== off) utc = naive - off2;
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Compact parts for the comic date plate on event cards, in the event's zone. */
export function formatDateParts(iso: string, timeZone: string) {
  const date = new Date(iso);
  const part = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { ...opts, timeZone }).format(date);
  return {
    month: part({ month: "short" }).toUpperCase(),
    day: part({ day: "2-digit" }),
    weekday: part({ weekday: "short" }),
    time: part({ hour: "numeric", minute: "2-digit" }),
  };
}

/** Full human date, e.g. "Thursday, October 9, 2026", in the event's zone. */
export function formatFullDate(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(new Date(iso));
}

/** Time only, e.g. "1:00 PM", in the event's zone. */
export function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

/** A true-UTC instant → "YYYY-MM-DDTHH:mm" wall-clock in `timeZone` (form input). */
export function toDatetimeLocalValue(iso: string, timeZone: string): string {
  const p = getZonedParts(iso, timeZone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** A true-UTC instant → "YYYYMMDDTHHMMSS" wall-clock digits in `timeZone` (iCal). */
export function toZonedStamp(iso: string, timeZone: string): string {
  const p = getZonedParts(iso, timeZone);
  return `${p.year}${p.month}${p.day}T${p.hour}${p.minute}${p.second}`;
}

/** Whether an event's end (or start, if no end) is in the past. */
export function isEventOver(event: {
  starts_at: string;
  ends_at: string | null;
}): boolean {
  return new Date(event.ends_at ?? event.starts_at).getTime() < Date.now();
}
