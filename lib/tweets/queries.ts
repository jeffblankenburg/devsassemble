import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type TweetAlternative = {
  kind: string;
  body: string;
  source_url: string | null;
  rationale: string;
};

export type TweetRow = {
  id: string;
  status: "draft" | "posted" | "rejected";
  kind: string;
  body: string;
  source_url: string | null;
  rationale: string | null;
  alternatives: TweetAlternative[];
  created_for: string;
  posted_url: string | null;
  bluesky_url: string | null;
  posted_at: string | null;
  created_at: string;
};

const COLUMNS =
  "id, status, kind, body, source_url, rationale, alternatives, created_for, posted_url, bluesky_url, posted_at, created_at";

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
