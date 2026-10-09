// Pure, client-safe helpers for the recurrence editor and server-side RRULE
// assembly. The "body" is the RFC-5545 RRULE PATTERN only (FREQ/INTERVAL/BY*).
// End conditions (count/until) live on the event, not in the body, so the
// local-vs-UTC frames never clash during expansion.

export type RecurFreq = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type MonthMode = "dayofmonth" | "weekday";
export type EndMode = "never" | "count" | "until";

export const WEEKDAYS = [
  { code: "SU", short: "Sun", full: "Sunday" },
  { code: "MO", short: "Mon", full: "Monday" },
  { code: "TU", short: "Tue", full: "Tuesday" },
  { code: "WE", short: "Wed", full: "Wednesday" },
  { code: "TH", short: "Thu", full: "Thursday" },
  { code: "FR", short: "Fri", full: "Friday" },
  { code: "SA", short: "Sat", full: "Saturday" },
] as const;

export type RecurParts = {
  freq: RecurFreq;
  interval: number;
  byday: string[]; // weekly: weekday codes
  monthMode: MonthMode;
  end: EndMode;
  count: number | null;
  until: string | null; // YYYY-MM-DD
};

const CODE_BY_DOW = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const FREQ_TO_RRULE: Record<Exclude<RecurFreq, "none">, string> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
  yearly: "YEARLY",
};

/** Weekday code (SU..SA) for a local Y-M-D. */
export function weekdayCode(year: number, month: number, day: number): string {
  return CODE_BY_DOW[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/** Which occurrence of its weekday a day-of-month is (1..5). */
export function weekdayOrdinal(day: number): number {
  return Math.floor((day - 1) / 7) + 1;
}

function fullWeekday(code: string): string {
  return WEEKDAYS.find((w) => w.code === code)?.full ?? code;
}

/**
 * Build the RRULE pattern body from parts + the event's LOCAL start date.
 * Monthly "weekday" mode uses the start's weekday; a 5th occurrence falls back
 * to "last" (-1). End conditions are NOT encoded here (they live on the event).
 */
export function buildRuleBody(
  parts: RecurParts,
  start: { year: number; month: number; day: number },
): string | null {
  if (parts.freq === "none") return null;
  const bits = [`FREQ=${FREQ_TO_RRULE[parts.freq]}`];
  if (parts.interval > 1) bits.push(`INTERVAL=${parts.interval}`);

  if (parts.freq === "weekly") {
    const days = parts.byday.length
      ? parts.byday
      : [weekdayCode(start.year, start.month, start.day)];
    bits.push(`BYDAY=${days.join(",")}`);
  }

  if (parts.freq === "monthly") {
    if (parts.monthMode === "weekday") {
      const ord = weekdayOrdinal(start.day);
      const nth = ord >= 5 ? -1 : ord; // 5th weekday → last
      bits.push(`BYDAY=${nth}${weekdayCode(start.year, start.month, start.day)}`);
    } else {
      bits.push(`BYMONTHDAY=${start.day}`);
    }
  }
  // yearly: month + day come from DTSTART; no BY* needed.

  return bits.join(";");
}

/** Parse a stored body into form parts (best-effort; end comes from the event). */
export function parseRuleBody(body: string | null): Pick<
  RecurParts,
  "freq" | "interval" | "byday" | "monthMode"
> {
  if (!body) return { freq: "none", interval: 1, byday: [], monthMode: "dayofmonth" };
  const map: Record<string, string> = {};
  for (const kv of body.split(";")) {
    const [k, v] = kv.split("=");
    if (k) map[k.toUpperCase()] = v ?? "";
  }
  const freqMap: Record<string, RecurFreq> = {
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    YEARLY: "yearly",
  };
  const freq = freqMap[map.FREQ] ?? "none";
  const interval = map.INTERVAL ? parseInt(map.INTERVAL, 10) || 1 : 1;
  const byday = freq === "weekly" && map.BYDAY ? map.BYDAY.split(",") : [];
  const monthMode: MonthMode =
    freq === "monthly" && map.BYDAY ? "weekday" : "dayofmonth";
  return { freq, interval, byday, monthMode };
}

/** Human-readable description for the editor preview. */
export function describeRecurrence(
  parts: RecurParts,
  start?: { year: number; month: number; day: number },
): string {
  if (parts.freq === "none") return "Does not repeat";
  const n = parts.interval;
  const unit = { daily: "day", weekly: "week", monthly: "month", yearly: "year" }[
    parts.freq
  ];
  let base = n > 1 ? `Every ${n} ${unit}s` : `Every ${unit}`;

  if (parts.freq === "weekly") {
    const days = parts.byday.length
      ? parts.byday
      : start
        ? [weekdayCode(start.year, start.month, start.day)]
        : [];
    const names = days
      .map((c) => WEEKDAYS.find((w) => w.code === c)?.short ?? c)
      .filter(Boolean);
    if (names.length) base += ` on ${names.join(", ")}`;
  }

  if (parts.freq === "monthly" && start) {
    if (parts.monthMode === "weekday") {
      const ord = weekdayOrdinal(start.day);
      const ordLabel =
        ord >= 5 ? "last" : ["first", "second", "third", "fourth"][ord - 1];
      base += ` on the ${ordLabel} ${fullWeekday(weekdayCode(start.year, start.month, start.day))}`;
    } else {
      base += ` on day ${start.day}`;
    }
  }

  if (parts.end === "count" && parts.count) base += `, ${parts.count} times`;
  else if (parts.end === "until" && parts.until) base += `, until ${parts.until}`;
  return base;
}
