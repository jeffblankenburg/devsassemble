import { listEventsForCalendar } from "@/lib/events/queries";
import { buildCalendar } from "@/lib/events/ical";

function siteUrl(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

/** Subscribable iCal feed of all published (+ cancelled) events. */
export async function GET(request: Request) {
  const events = await listEventsForCalendar();
  const body = buildCalendar(events, siteUrl(request), new Date());

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="devsassemble.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
