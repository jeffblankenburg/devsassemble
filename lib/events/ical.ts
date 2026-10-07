import type { EventRow } from "./queries";

// RFC 5545 text escaping.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Stored timestamps are the event's wall-clock interpreted as UTC (see
// docs/DECISIONS.md). For iCal we emit those digits with the event's TZID, so
// "1:00 PM" in the event's timezone round-trips correctly in calendar clients.
// "2026-10-08T13:00:00Z" -> "20261008T130000"
function localStamp(iso: string): string {
  return iso.slice(0, 19).replace(/[-:]/g, "");
}

// A real UTC instant -> "YYYYMMDDTHHMMSSZ" (for DTSTAMP).
function utcStamp(date: Date): string {
  return `${date.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
}

// RFC 5545 line folding at 75 octets (approximated by chars).
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 73) {
    parts.push((i === 0 ? "" : " ") + line.slice(i, i + 73));
  }
  return parts.join("\r\n");
}

const RRULE: Record<string, string | null> = {
  none: null,
  daily: "FREQ=DAILY",
  weekly: "FREQ=WEEKLY",
  biweekly: "FREQ=WEEKLY;INTERVAL=2",
  monthly: "FREQ=MONTHLY",
};

export function buildVEvent(
  event: EventRow,
  siteUrl: string,
  now: Date,
): string {
  const url = `${siteUrl}/events/${event.slug}`;
  const tz = event.timezone || "UTC";
  const description = [event.summary ?? event.description ?? "", url]
    .filter(Boolean)
    .join("\n\n");
  const rrule = RRULE[event.recurrence] ?? null;

  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.id}@devsassemble.ai`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART;TZID=${tz}:${localStamp(event.starts_at)}`,
    ...(event.ends_at ? [`DTEND;TZID=${tz}:${localStamp(event.ends_at)}`] : []),
    ...(rrule ? [`RRULE:${rrule}`] : []),
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${escapeText(url)}`,
    `LOCATION:${escapeText(
      event.location ?? (event.is_virtual ? "Virtual" : ""),
    )}`,
    `STATUS:${event.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
  ];
  return lines.map(fold).join("\r\n");
}

export function buildCalendar(
  events: EventRow[],
  siteUrl: string,
  now: Date,
): string {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DevsAssemble//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:DevsAssemble Events",
    "X-WR-CALDESC:Upcoming DevsAssemble livestreams and meetups",
  ].join("\r\n");

  const body = events.map((e) => buildVEvent(e, siteUrl, now)).join("\r\n");

  return `${header}\r\n${body}\r\n${"END:VCALENDAR"}\r\n`;
}
