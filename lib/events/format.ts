// Event date formatting.
//
// DECISION (see docs/DECISIONS.md): event times are stored as the admin's
// wall-clock interpreted as UTC and are ALWAYS displayed in UTC, so the time
// shown equals exactly what the admin entered. The timezone label communicates
// the intended zone. Proper multi-timezone conversion is deferred (needs a TZ
// library); for a single-community listing this is predictable and bug-free.

const TZ_LABELS: Record<string, string> = {
  "America/New_York": "ET",
  "America/Chicago": "CT",
  "America/Denver": "MT",
  "America/Los_Angeles": "PT",
  "Europe/London": "GMT",
  "Europe/Berlin": "CET",
  UTC: "UTC",
};

export function tzLabel(tz?: string | null): string {
  if (!tz) return "";
  return TZ_LABELS[tz] ?? tz;
}

/** Compact parts for the comic date plate on event cards. */
export function formatDateParts(iso: string) {
  const date = new Date(iso);
  const part = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(date);
  return {
    month: part({ month: "short" }).toUpperCase(),
    day: part({ day: "2-digit" }),
    weekday: part({ weekday: "short" }),
    time: part({ hour: "numeric", minute: "2-digit" }),
  };
}

/** Full human date, e.g. "Thursday, October 9, 2026". */
export function formatFullDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Time only, e.g. "1:00 PM". */
export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Convert a stored UTC ISO timestamp back to a datetime-local input value. */
export function toDatetimeLocalValue(iso: string): string {
  // Stored as UTC wall-clock; slice to "YYYY-MM-DDTHH:mm".
  return iso.slice(0, 16);
}

/**
 * Whether an event's end (or start, if no end) is in the past. Kept in this
 * (non-component) module so the current-time read stays out of render — the
 * react-hooks/purity rule flags Date.now()/new Date() inside components.
 */
export function isEventOver(event: {
  starts_at: string;
  ends_at: string | null;
}): boolean {
  return new Date(event.ends_at ?? event.starts_at).getTime() < Date.now();
}
