"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import { eventSchema, rsvpStatusEnum } from "@/lib/validation/events";
import {
  DEFAULT_TIMEZONE,
  zonedWallClockToUtcIso,
  formatFullDate,
  formatTime,
  tzLabel,
} from "@/lib/events/format";
import { notifyEventChange } from "@/lib/email/send";
import { buildRuleBody, type RecurParts } from "@/lib/events/rrule";
import { geocodeAddress } from "@/lib/events/geocode";

/** Human "when" line for emails, e.g. "Fri, Oct 10 at 6:00 PM (ET)". */
function whenLabel(iso: string, tz: string): string {
  return `${formatFullDate(iso, tz)} at ${formatTime(iso, tz)} (${tzLabel(tz)})`;
}

export type EventFormState = { error?: string };

function nullIfEmpty(value: string | undefined | null): string | null {
  return value && value.trim() !== "" ? value : null;
}

function parseEventForm(formData: FormData) {
  // Conditionally-rendered fields (location/url/recurrence_until) are absent
  // from the form, so formData.get() returns null — coerce to undefined so the
  // optional schemas accept them (null would fail validation).
  const g = (k: string) => formData.get(k) ?? undefined;
  return eventSchema.safeParse({
    title: g("title"),
    slug: g("slug"),
    summary: g("summary"),
    description: g("description"),
    starts_at: g("starts_at"),
    ends_at: g("ends_at"),
    timezone: g("timezone"),
    location: g("location"),
    url: g("url"),
    rsvp_url: g("rsvp_url"),
    host: g("host"),
    accent: g("accent"),
    status: g("status"),
    recur_freq: g("recur_freq") ?? "none",
    recur_interval: g("recur_interval") ?? 1,
    recur_byday: g("recur_byday"),
    recur_month_mode: g("recur_month_mode") ?? "dayofmonth",
    recur_end: g("recur_end") ?? "never",
    recur_count: g("recur_count"),
    recur_until: g("recur_until"),
  });
}

function eventRecordFrom(
  data: ReturnType<typeof eventSchema.parse>,
  formData: FormData,
) {
  const timezone = nullIfEmpty(data.timezone) ?? DEFAULT_TIMEZONE;
  const startIso = zonedWallClockToUtcIso(data.starts_at, timezone);
  if (!startIso) return { error: "Invalid start date and time." as const };

  // Assemble the RRULE pattern from the structured recurrence fields. Monthly
  // specifics (day-of-month / Nth weekday) derive from the LOCAL start date, so
  // they stay correct even if the admin changed the start.
  let rrule: string | null = null;
  let recurrence_count: number | null = null;
  let recurrence_until: string | null = null;
  if (data.recur_freq !== "none") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data.starts_at);
    const start = m
      ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
      : { year: 2000, month: 1, day: 1 };
    const parts: RecurParts = {
      freq: data.recur_freq,
      interval: data.recur_interval,
      byday: data.recur_byday ? data.recur_byday.split(",").filter(Boolean) : [],
      monthMode: data.recur_month_mode,
      end: data.recur_end,
      count: data.recur_count ?? null,
      until: nullIfEmpty(data.recur_until)?.slice(0, 10) ?? null,
    };
    rrule = buildRuleBody(parts, start);
    if (data.recur_end === "count") recurrence_count = data.recur_count ?? null;
    else if (data.recur_end === "until")
      recurrence_until = nullIfEmpty(data.recur_until)?.slice(0, 10) ?? null;
  }

  return {
    record: {
      title: data.title,
      slug: data.slug,
      summary: nullIfEmpty(data.summary),
      description: nullIfEmpty(data.description),
      starts_at: startIso,
      ends_at: data.ends_at
        ? zonedWallClockToUtcIso(data.ends_at, timezone)
        : null,
      timezone,
      location: nullIfEmpty(data.location),
      url: nullIfEmpty(data.url),
      rsvp_url: nullIfEmpty(data.rsvp_url),
      is_virtual: formData.get("is_virtual") === "true",
      host: nullIfEmpty(data.host),
      accent: data.accent,
      status: data.status,
      recurrence: "none" as const, // legacy column; RRULE is now authoritative
      rrule,
      recurrence_count,
      recurrence_until,
    },
  };
}

/** Allow admins/mods, or the event's own creator. Redirects otherwise. */
async function requireEventEditor(eventId: string): Promise<{ isAdmin: boolean }> {
  const user = await requireUser();
  const isAdmin = user.role === "admin" || user.role === "moderator";
  if (isAdmin) return { isAdmin };
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .maybeSingle<{ created_by: string | null }>();
  if (!data || data.created_by !== user.id) redirect("/events");
  return { isAdmin };
}

export async function createEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const user = await requireUser();
  const isAdmin = user.role === "admin" || user.role === "moderator";

  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const built = eventRecordFrom(parsed.data, formData);
  if ("error" in built) return { error: built.error };

  // Geocode in-person addresses for the "near me" filter (best-effort).
  const geo =
    !built.record.is_virtual && built.record.location
      ? await geocodeAddress(built.record.location)
      : null;

  // Members' events auto-publish; admins keep draft/publish control.
  const record = {
    ...built.record,
    created_by: user.id,
    status: isAdmin ? built.record.status : ("published" as const),
    latitude: geo?.lat ?? null,
    longitude: geo?.lng ?? null,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("events").insert(record);

  if (error) {
    if (error.code === "23505") return { error: "That slug is already taken." };
    return { error: error.message };
  }

  revalidatePath("/events");
  revalidatePath("/");
  if (isAdmin) {
    revalidatePath("/admin/events");
    redirect("/admin/events");
  }
  redirect(`/events/${built.record.slug}`);
}

export async function updateEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing event id." };
  const { isAdmin } = await requireEventEditor(id);

  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const built = eventRecordFrom(parsed.data, formData);
  if ("error" in built) return { error: built.error };

  const supabase = await createClient();

  // Snapshot the prior state so we can tell attendees what changed and avoid
  // re-geocoding an unchanged address.
  const { data: prior } = await supabase
    .from("events")
    .select("status, starts_at, location, latitude, longitude")
    .eq("id", id)
    .maybeSingle<{
      status: string;
      starts_at: string;
      location: string | null;
      latitude: number | null;
      longitude: number | null;
    }>();

  // Keep coords in sync: geocode when the address changed (or is missing),
  // clear them when the event isn't in-person.
  const rec = built.record;
  let latitude = prior?.latitude ?? null;
  let longitude = prior?.longitude ?? null;
  if (!rec.is_virtual && rec.location) {
    if (rec.location !== prior?.location || latitude == null) {
      const geo = await geocodeAddress(rec.location);
      latitude = geo?.lat ?? null;
      longitude = geo?.lng ?? null;
    }
  } else {
    latitude = null;
    longitude = null;
  }

  const { error } = await supabase
    .from("events")
    .update({ ...rec, latitude, longitude })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "That slug is already taken." };
    return { error: error.message };
  }

  // Notify RSVPs on a material change to a live event: cancellation, or a
  // start-time move while published. Draft edits reach no one (no RSVPs).
  if (prior) {
    const rec = built.record;
    const base = {
      eventId: id,
      slug: rec.slug,
      eventTitle: rec.title,
      whenLabel: whenLabel(rec.starts_at, rec.timezone),
    };
    if (prior.status === "published" && rec.status === "cancelled") {
      after(() => notifyEventChange({ ...base, kind: "cancelled" }));
    } else if (
      prior.status === "published" &&
      rec.status === "published" &&
      prior.starts_at !== rec.starts_at
    ) {
      after(() =>
        notifyEventChange({
          ...base,
          kind: "changed",
          changeSummary: "the start time changed",
        }),
      );
    }
  }

  revalidatePath("/events");
  revalidatePath(`/events/${built.record.slug}`);
  revalidatePath("/");
  if (isAdmin) {
    revalidatePath("/admin/events");
    redirect("/admin/events");
  }
  redirect(`/events/${built.record.slug}`);
}

/** Create or update the current user's RSVP. Invoked from a logged-in control. */
export async function setRsvp(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eventId = String(formData.get("event_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const occurrenceStart = String(formData.get("occurrence_start") ?? "");
  const parsedStatus = rsvpStatusEnum.safeParse(formData.get("status"));
  if (!eventId || !occurrenceStart || !parsedStatus.success) return;

  const supabase = await createClient();
  const { error } = await supabase.from("rsvps").upsert(
    {
      event_id: eventId,
      user_id: user.id,
      occurrence_start: occurrenceStart,
      status: parsedStatus.data,
    },
    { onConflict: "event_id,user_id,occurrence_start" },
  );
  if (error) throw error;

  revalidatePath("/events");
  if (slug) revalidatePath(`/events/${slug}`);
}

export async function cancelRsvp(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eventId = String(formData.get("event_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const occurrenceStart = String(formData.get("occurrence_start") ?? "");
  if (!eventId || !occurrenceStart) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("rsvps")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .eq("occurrence_start", occurrenceStart);
  if (error) throw error;

  revalidatePath("/events");
  if (slug) revalidatePath(`/events/${slug}`);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Add or remove one occurrence date from a recurring event's skip list. */
async function setOccurrenceSkipped(
  formData: FormData,
  skipped: boolean,
): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!id || !ISO_DATE.test(date)) return;
  await requireEventEditor(id);

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("recurrence_exceptions, slug")
    .eq("id", id)
    .single();
  if (!event) return;

  const current: string[] = event.recurrence_exceptions ?? [];
  const next = skipped
    ? [...new Set([...current, date])].sort()
    : current.filter((d) => d !== date);

  const { error } = await supabase
    .from("events")
    .update({ recurrence_exceptions: next })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/");
  revalidatePath(`/admin/events/${id}/edit`);
}

export async function skipOccurrence(formData: FormData): Promise<void> {
  await setOccurrenceSkipped(formData, true);
}

export async function restoreOccurrence(formData: FormData): Promise<void> {
  await setOccurrenceSkipped(formData, false);
}

type Override = { date: string; starts_at: string };

/** Move a single occurrence to a new local date/time (keeps the duration). */
export async function moveOccurrence(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("date") ?? ""); // original local date
  const to = String(formData.get("to") ?? ""); // new local "YYYY-MM-DDTHH:mm"
  if (!id || !ISO_DATE.test(date) || !to) return;
  await requireEventEditor(id);

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("recurrence_overrides, recurrence_exceptions, timezone, slug")
    .eq("id", id)
    .single<{
      recurrence_overrides: Override[] | null;
      recurrence_exceptions: string[] | null;
      timezone: string;
      slug: string;
    }>();
  if (!event) return;

  const startIso = zonedWallClockToUtcIso(to, event.timezone);
  if (!startIso) return;

  const overrides = [
    ...(event.recurrence_overrides ?? []).filter((o) => o.date !== date),
    { date, starts_at: startIso },
  ].sort((a, b) => (a.date < b.date ? -1 : 1));
  // Moving an occurrence un-cancels it if it was previously skipped.
  const exceptions = (event.recurrence_exceptions ?? []).filter((d) => d !== date);

  const { error } = await supabase
    .from("events")
    .update({ recurrence_overrides: overrides, recurrence_exceptions: exceptions })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/");
  revalidatePath(`/admin/events/${id}/edit`);
}

/** Undo a move — restore the occurrence to its original scheduled time. */
export async function resetOccurrence(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!id || !ISO_DATE.test(date)) return;
  await requireEventEditor(id);

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("recurrence_overrides, slug")
    .eq("id", id)
    .single<{ recurrence_overrides: Override[] | null; slug: string }>();
  if (!event) return;

  const overrides = (event.recurrence_overrides ?? []).filter(
    (o) => o.date !== date,
  );
  const { error } = await supabase
    .from("events")
    .update({ recurrence_overrides: overrides })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/");
  revalidatePath(`/admin/events/${id}/edit`);
}
