import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type TweetRow = {
  id: string;
  status: "draft" | "scheduled" | "posted" | "rejected";
  kind: string;
  body: string;
  source_url: string | null;
  rationale: string | null;
  created_for: string;
  batch_date: string | null;
  scheduled_for: string | null;
  posted_url: string | null;
  bluesky_url: string | null;
  posted_at: string | null;
  created_at: string;
};

const COLUMNS =
  "id, status, kind, body, source_url, rationale, created_for, batch_date, scheduled_for, posted_url, bluesky_url, posted_at, created_at";

export async function listDraftTweets(): Promise<TweetRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tweets")
    .select(COLUMNS)
    .eq("status", "draft")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TweetRow[];
}

export async function listScheduledTweets(): Promise<TweetRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tweets")
    .select(COLUMNS)
    .eq("status", "scheduled")
    .order("scheduled_for", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TweetRow[];
}

/**
 * Public-safe projection of a posted item for the on-site feed. Deliberately
 * excludes internal fields (rationale, kind, approval) so nothing but what we
 * actually published reaches the public page.
 */
export type PublicPost = {
  id: string;
  body: string;
  source_url: string | null;
  posted_url: string | null;
  bluesky_url: string | null;
  posted_at: string | null;
};

/** Everything @devsassembleAI has published, newest first — for /feed. */
export async function listPublicFeed(limit = 30, offset = 0): Promise<PublicPost[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tweets")
    .select("id, body, source_url, posted_url, bluesky_url, posted_at")
    .eq("status", "posted")
    .order("posted_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []) as PublicPost[];
}

/** Total count of published posts, for feed pagination. */
export async function countPublicFeed(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("tweets")
    .select("id", { count: "exact", head: true })
    .eq("status", "posted");
  if (error) throw error;
  return count ?? 0;
}

export async function listRecentPostedTweets(limit = 10): Promise<TweetRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tweets")
    .select(COLUMNS)
    .eq("status", "posted")
    .order("posted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as TweetRow[];
}
