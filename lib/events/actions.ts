"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth/dal";
import { eventSchema, rsvpStatusEnum } from "@/lib/validation/events";

export type EventFormState = { error?: string };

/** Interpret a datetime-local value ("YYYY-MM-DDTHH:mm") as UTC wall-clock. */
function toUtcIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(`${local}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nullIfEmpty(value: string | undefined | null): string | null {
  return value && value.trim() !== "" ? value : null;
}

function parseEventForm(formData: FormData) {
  return eventSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    timezone: formData.get("timezone"),
    location: formData.get("location"),
    url: formData.get("url"),
    host: formData.get("host"),
    accent: formData.get("accent"),
    status: formData.get("status"),
    recurrence: formData.get("recurrence") ?? "none",
  });
}

function eventRecordFrom(
  data: ReturnType<typeof eventSchema.parse>,
  formData: FormData,
) {
  const startIso = toUtcIso(data.starts_at);
  if (!startIso) return { error: "Invalid start date and time." as const };

  return {
    record: {
      title: data.title,
      slug: data.slug,
      summary: nullIfEmpty(data.summary),
      description: nullIfEmpty(data.description),
      starts_at: startIso,
      ends_at: data.ends_at ? toUtcIso(data.ends_at) : null,
      timezone: nullIfEmpty(data.timezone) ?? "America/New_York",
      location: nullIfEmpty(data.location),
      url: nullIfEmpty(data.url),
      is_virtual: formData.get("is_virtual") === "true",
      host: nullIfEmpty(data.host),
      accent: data.accent,
      status: data.status,
      recurrence: data.recurrence,
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

  if (slug) revalidatePath(`/events/${slug}`);
}
