import type { EventRow } from "./queries";
import { toZonedStamp } from "./format";

// RFC 5545 text escaping.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
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
  // The stored RRULE body is the pattern only; append the end (COUNT or UNTIL).
  const rrule = event.rrule;
  const end = !rrule
    ? ""
    : event.recurrence_count
      ? `;COUNT=${event.recurrence_count}`
      : event.recurrence_until
        ? `;UNTIL=${event.recurrence_until.replace(/-/g, "")}T235959Z`
        : "";

  // Skipped occurrences: exclude each cancelled date at the series' local time.
  const timeOfDay = toZonedStamp(event.starts_at, tz).slice(9); // "HHMMSS"
  const exdates =
    rrule && event.recurrence_exceptions.length > 0
      ? event.recurrence_exceptions.map(
          (d) => `EXDATE;TZID=${tz}:${d.replace(/-/g, "")}T${timeOfDay}`,
        )
      : [];

  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.id}@devsassemble.ai`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART;TZID=${tz}:${toZonedStamp(event.starts_at, tz)}`,
    ...(event.ends_at
      ? [`DTEND;TZID=${tz}:${toZonedStamp(event.ends_at, tz)}`]
      : []),
    ...(rrule ? [`RRULE:${rrule}${end}`] : []),
    ...exdates,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${escapeText(url)}`,
    `LOCATION:${escapeText(
      event.location ?? (event.is_virtual ? "Virtual" : ""),
    )}`,
    `STATUS:${event.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
  ];

  const commonLines = [
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${escapeText(url)}`,
    `LOCATION:${escapeText(event.location ?? (event.is_virtual ? "Virtual" : ""))}`,
    `STATUS:${event.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
  ];

  // Moved occurrences: a RECURRENCE-ID override VEVENT replaces the generated
  // instance at `date` with the new start (duration preserved).
  const durationMs = event.ends_at
    ? new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()
    : null;
  const overrides = (rrule ? event.recurrence_overrides : []).map((o) => {
    const newEndIso =
      durationMs != null
        ? new Date(new Date(o.starts_at).getTime() + durationMs).toISOString()
        : null;
    const oLines = [
      "BEGIN:VEVENT",
      `UID:${event.id}@devsassemble.ai`,
      `DTSTAMP:${utcStamp(now)}`,
      `RECURRENCE-ID;TZID=${tz}:${o.date.replace(/-/g, "")}T${timeOfDay}`,
      `DTSTART;TZID=${tz}:${toZonedStamp(o.starts_at, tz)}`,
      ...(newEndIso ? [`DTEND;TZID=${tz}:${toZonedStamp(newEndIso, tz)}`] : []),
      ...commonLines,
      "END:VEVENT",
    ];
    return oLines.map(fold).join("\r\n");
  });

  return [lines.map(fold).join("\r\n"), ...overrides].join("\r\n");
}

export function buildCalendar(
  events: EventRow[],
  siteUrl: string,
  now: Date,
): string {
  const calName = "DevsAssemble";
  const calDesc = "Upcoming DevsAssemble livestreams and meetups";
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DevsAssemble//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    // RFC 7986 properties (preferred by modern clients)…
    `NAME:${escapeText(calName)}`,
    `DESCRIPTION:${escapeText(calDesc)}`,
    // …plus the older X-WR-* equivalents for broad compatibility.
    `X-WR-CALNAME:${escapeText(calName)}`,
    `X-WR-CALDESC:${escapeText(calDesc)}`,
  ].join("\r\n");

  const body = events.map((e) => buildVEvent(e, siteUrl, now)).join("\r\n");

  return `${header}\r\n${body}\r\n${"END:VCALENDAR"}\r\n`;
}
