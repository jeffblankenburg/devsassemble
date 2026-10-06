import { getEventBySlug } from "@/lib/events/queries";
import { buildCalendar } from "@/lib/events/ical";

function siteUrl(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

/** Single-event iCal download ("add to calendar"). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) {
    return new Response("Not found", { status: 404 });
  }

  const body = buildCalendar([event], siteUrl(request), new Date());

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
