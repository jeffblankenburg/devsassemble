import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  upcomingOccurrences,
  latestPastOccurrence,
} from "@/lib/events/recurrence";

export type EventAccent = "blue" | "lime" | "purple";
export type EventStatus = "draft" | "published" | "cancelled";
export type RsvpStatus = "going" | "interested";
export type RecurrenceFreq =
  | "none"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly";

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
  url: string | null;
  is_virtual: boolean;
  host: string | null;
  accent: EventAccent;
  status: EventStatus;
  recurrence: RecurrenceFreq;
  recurrence_until: string | null;
  recurrence_exceptions: string[];
  is_live: boolean;
  stream_embed_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Set when a row is a materialized occurrence of a recurring series — a
  // stable, unique React key (several occurrences share the same `id`).
  occurrenceKey?: string;
};

const EVENT_COLUMNS =
  "id, slug, title, summary, description, starts_at, ends_at, timezone, location, url, is_virtual, host, accent, status, recurrence, recurrence_until, recurrence_exceptions, is_live, stream_embed_url, created_by, created_at, updated_at";

/** How many upcoming occurrences of each recurring series to surface. */
const OCCURRENCES_AHEAD = 2;

/**
 * Published events, upcoming (ascending) or past (descending). RLS-safe.
 *
 * Recurring events are stored as a single row; we expand them at read time so
 * the next occurrences appear even after the base `starts_at` has passed. We
 * therefore fetch all published rows and split in JS rather than filtering by
 * `starts_at` in SQL.
 */
export async function listPublishedEvents(opts?: {
  when?: "upcoming" | "past";
  limit?: number;
}): Promise<EventRow[]> {
  const supabase = await createClient();
  const now = new Date();
  const when = opts?.when ?? "upcoming";

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("status", "published");
  if (error) throw error;
  const rows = (data ?? []) as EventRow[];

  let result: EventRow[];
  if (when === "upcoming") {
    result = rows
      .flatMap((e) => upcomingOccurrences(e, now, OCCURRENCES_AHEAD))
      .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1));
  } else {
    result = rows
      .map((e) => latestPastOccurrence(e, now))
      .filter((e): e is EventRow => e !== null)
      .sort((a, b) => (a.starts_at > b.starts_at ? -1 : 1));
  }

  return opts?.limit ? result.slice(0, opts.limit) : result;
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

/** Published + cancelled events for the iCal feed (cancellations propagate). */
export async function listEventsForCalendar(): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .in("status", ["published", "cancelled"])
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventRow[];
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
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export type AdminEventFilter =
  | "all"
  | "published"
  | "draft"
  | "cancelled"
  | "past";

/**
 * Filter + sort events for the admin list and count each bucket. Reads the
 * current time here (a server helper) so the component render stays pure.
 * "Past" means the event has already started, regardless of status; the
 * status filters show only still-upcoming events of that status.
 */
export function filterAdminEvents(
  events: EventRow[],
  filter: AdminEventFilter,
): {
  events: EventRow[];
  counts: Record<AdminEventFilter, number>;
  pastIds: Set<string>;
} {
  const now = new Date();
  // A recurring series is "past" only once it has no upcoming occurrence left.
  const isPast = (e: EventRow) => upcomingOccurrences(e, now, 1).length === 0;
  const pastIds = new Set(events.filter(isPast).map((e) => e.id));

  const counts: Record<AdminEventFilter, number> = {
    all: events.length,
    published: events.filter((e) => e.status === "published" && !isPast(e))
      .length,
    draft: events.filter((e) => e.status === "draft" && !isPast(e)).length,
    cancelled: events.filter((e) => e.status === "cancelled" && !isPast(e))
      .length,
    past: events.filter(isPast).length,
  };

  const match = (e: EventRow): boolean => {
    switch (filter) {
      case "all":
        return true;
      case "past":
        return isPast(e);
      default:
        return e.status === filter && !isPast(e);
    }
  };

  const sorted = events.filter(match).sort((a, b) => {
    const ta = new Date(a.starts_at).getTime();
    const tb = new Date(b.starts_at).getTime();
    // Past: most recent first. Everything else: soonest upcoming first.
    return filter === "past" ? tb - ta : ta - tb;
  });

  return { events: sorted, counts, pastIds };
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

  // Fetch all their RSVP'd published events, then expand recurring series so
  // the next occurrence shows even once the base start has passed.
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .in("id", ids)
    .eq("status", "published");
  if (error) throw error;

  const now = new Date();
  return ((data ?? []) as EventRow[])
    .flatMap((e) => upcomingOccurrences(e, now, 1))
    .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1))
    .slice(0, limit);
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
