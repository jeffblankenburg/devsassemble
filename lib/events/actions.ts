"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth/dal";
import { eventSchema, rsvpStatusEnum } from "@/lib/validation/events";
import { DEFAULT_TIMEZONE, zonedWallClockToUtcIso } from "@/lib/events/format";

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
    host: g("host"),
    accent: g("accent"),
    status: g("status"),
    recurrence: g("recurrence") ?? "none",
    recurrence_until: g("recurrence_until"),
  });
}

function eventRecordFrom(
  data: ReturnType<typeof eventSchema.parse>,
  formData: FormData,
) {
  const timezone = nullIfEmpty(data.timezone) ?? DEFAULT_TIMEZONE;
  const startIso = zonedWallClockToUtcIso(data.starts_at, timezone);
  if (!startIso) return { error: "Invalid start date and time." as const };

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
      is_virtual: formData.get("is_virtual") === "true",
      host: nullIfEmpty(data.host),
      accent: data.accent,
      status: data.status,
      recurrence: data.recurrence,
      // Only keep an end date for an actually-recurring event.
      recurrence_until:
        data.recurrence !== "none"
          ? (nullIfEmpty(data.recurrence_until)?.slice(0, 10) ?? null)
          : null,
    },
  };
}

export async function createEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const user = await requireAdmin();

  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const built = eventRecordFrom(parsed.data, formData);
  if ("error" in built) return { error: built.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .insert({ ...built.record, created_by: user.id });

  if (error) {
    if (error.code === "23505") return { error: "That slug is already taken." };
    return { error: error.message };
  }

  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function updateEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing event id." };

  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const built = eventRecordFrom(parsed.data, formData);
  if ("error" in built) return { error: built.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update(built.record)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "That slug is already taken." };
    return { error: error.message };
  }

  revalidatePath("/events");
  revalidatePath(`/events/${built.record.slug}`);
  revalidatePath("/");
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

/** Create or update the current user's RSVP. Invoked from a logged-in control. */
export async function setRsvp(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eventId = String(formData.get("event_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const parsedStatus = rsvpStatusEnum.safeParse(formData.get("status"));
  if (!eventId || !parsedStatus.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("rsvps")
    .upsert(
      { event_id: eventId, user_id: user.id, status: parsedStatus.data },
      { onConflict: "event_id,user_id" },
    );
  if (error) throw error;

  revalidatePath("/events");
  if (slug) revalidatePath(`/events/${slug}`);
}

export async function cancelRsvp(formData: FormData): Promise<void> {
  const user = await requireUser();
  const eventId = String(formData.get("event_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!eventId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("rsvps")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);
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
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!id || !ISO_DATE.test(date)) return;

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
