import { createAdminClient } from "@/lib/supabase/admin";
import { upcomingOccurrences } from "@/lib/events/recurrence";
import { formatFullDate, formatTime, tzLabel } from "@/lib/events/format";
import { sendEventReminder } from "@/lib/email/send";
import type { EventRow } from "@/lib/events/queries";

/**
 * Hourly reminder sweep. For every published event (recurring series expanded)
 * with an occurrence starting in the next 24h, email each "going" RSVP once.
 * Dedup is per (user, event, occurrence_start) via event_reminders_sent, so a
 * daily/weekly series is reminded for each occurrence but never twice.
 *
 * Guarded by CRON_SECRET (Vercel sends it as a bearer token).
 */
const WINDOW_MS = 24 * 60 * 60 * 1000;

const EVENT_COLUMNS =
  "id, slug, title, summary, description, starts_at, ends_at, timezone, location, url, is_virtual, host, accent, status, recurrence, recurrence_until, recurrence_exceptions, rrule, recurrence_count, recurrence_overrides, is_live, stream_embed_url, created_by, created_at, updated_at";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const now = new Date();
  const cutoffMs = now.getTime() + WINDOW_MS;

  const { data, error } = await admin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("status", "published");
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  const events = (data ?? []) as EventRow[];

  let reminded = 0;

  for (const event of events) {
    // Occurrences from now through the next 24h (skip cancelled dates).
    const occurrences = upcomingOccurrences(event, now, 3).filter((o) => {
      const ms = new Date(o.starts_at).getTime();
      return ms <= cutoffMs && o.status !== "cancelled";
    });
    if (occurrences.length === 0) continue;

    const locationLabel = event.is_virtual
      ? "Online"
      : (event.location ?? null);

    for (const occ of occurrences) {
      // RSVPs are per-occurrence — remind only those going to THIS date.
      const { data: rsvps } = await admin
        .from("rsvps")
        .select("user_id")
        .eq("event_id", event.id)
        .eq("occurrence_start", occ.starts_at)
        .eq("status", "going");
      const userIds = (rsvps ?? []).map((r) => (r as { user_id: string }).user_id);
      if (userIds.length === 0) continue;

      const whenLabel = `${formatFullDate(occ.starts_at, event.timezone)} at ${formatTime(
        occ.starts_at,
        event.timezone,
      )} (${tzLabel(event.timezone)})`;

      for (const userId of userIds) {
        // Claim this (user, occurrence) first; skip if already reminded.
        const { error: claimError } = await admin
          .from("event_reminders_sent")
          .insert({
            user_id: userId,
            event_id: event.id,
            occurrence_start: occ.starts_at,
          });
        if (claimError) {
          if (claimError.code !== "23505") {
            console.error("[event-reminders] claim failed", claimError);
          }
          continue; // duplicate → already reminded
        }

        await sendEventReminder(userId, {
          eventTitle: event.title,
          whenLabel,
          locationLabel,
          slug: event.slug,
        });
        reminded += 1;
      }
    }
  }

  return Response.json({ reminded });
}
