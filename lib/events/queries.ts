import "server-only";

import { createClient } from "@/lib/supabase/server";

export type EventAccent = "blue" | "lime" | "purple";
export type EventStatus = "draft" | "published" | "cancelled";
export type RsvpStatus = "going" | "interested";

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location: string | null;
  is_virtual: boolean;
  host: string | null;
  accent: EventAccent;
  status: EventStatus;
  is_live: boolean;
  stream_embed_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const EVENT_COLUMNS =
  "id, slug, title, summary, description, starts_at, ends_at, timezone, location, is_virtual, host, accent, status, is_live, stream_embed_url, created_by, created_at, updated_at";

/** Published events, upcoming (ascending) or past (descending). RLS-safe. */
export async function listPublishedEvents(opts?: {
  when?: "upcoming" | "past";
  limit?: number;
}): Promise<EventRow[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const when = opts?.when ?? "upcoming";

  let query = supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("status", "published");

  query =
    when === "upcoming"
      ? query.gte("starts_at", nowIso).order("starts_at", { ascending: true })
      : query.lt("starts_at", nowIso).order("starts_at", { ascending: false });

  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

/** A single event by its permanent slug. Visibility follows RLS. */
export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as EventRow) ?? null;
}

/** A single event by id (admin edit). Visibility follows RLS. */
export async function getEventById(id: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as EventRow) ?? null;
}

/** All events including drafts — admin management view (RLS gates to admins). */
export async function listAllEventsForAdmin(): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export type RsvpSummary = { going: number; interested: number };

export async function getRsvpSummary(eventId: string): Promise<RsvpSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rsvps")
    .select("status")
    .eq("event_id", eventId);
  if (error) throw error;

  const summary: RsvpSummary = { going: 0, interested: 0 };
  for (const row of (data ?? []) as { status: RsvpStatus }[]) {
    summary[row.status] += 1;
  }
  return summary;
}

export type Attendee = {
  user_id: string;
  status: RsvpStatus;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type RawAttendee = {
  user_id: string;
  status: RsvpStatus;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

/** Members who RSVP'd, newest-joined last. Powers the "who's going" list. */
export async function getAttendees(
  eventId: string,
  opts?: { status?: RsvpStatus; limit?: number },
): Promise<Attendee[]> {
  const supabase = await createClient();
  let query = supabase
    .from("rsvps")
    .select("user_id, status, profiles ( username, display_name, avatar_url )")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as RawAttendee[]).map((row) => ({
    user_id: row.user_id,
    status: row.status,
    username: row.profiles?.username ?? null,
    display_name: row.profiles?.display_name ?? null,
    avatar_url: row.profiles?.avatar_url ?? null,
  }));
}

/** Upcoming published events a member has RSVP'd to (two-step for robustness). */
export async function getUpcomingEventsForUser(
  userId: string,
  limit = 6,
): Promise<EventRow[]> {
  const supabase = await createClient();

  const { data: rsvpRows, error: rsvpError } = await supabase
    .from("rsvps")
    .select("event_id")
    .eq("user_id", userId);
  if (rsvpError) throw rsvpError;

  const ids = (rsvpRows ?? []).map((r) => (r as { event_id: string }).event_id);
  if (ids.length === 0) return [];

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .in("id", ids)
    .eq("status", "published")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

/** The current user's RSVP status for an event, or null. */
export async function getUserRsvp(
  eventId: string,
  userId: string,
): Promise<RsvpStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rsvps")
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.status as RsvpStatus) ?? null;
}
