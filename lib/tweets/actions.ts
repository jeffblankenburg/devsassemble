"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishTweet } from "@/lib/tweets/publish";
import { draftTweets } from "@/lib/tweets/pipeline";
import { tweetLength, TWEET_MAX } from "@/lib/tweets/length";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TweetActionState = {
  ok?: boolean;
  error?: string;
  url?: string;
  blueskyUrl?: string;
  warning?: string;
};

const VALID_KINDS = new Set([
  "event",
  "tool",
  "discussion",
  "project",
  "evergreen",
  "news",
]);

async function loadStatus(
  db: SupabaseClient,
  id: string,
): Promise<string | null> {
  const { data } = await db
    .from("tweets")
    .select("status")
    .eq("id", id)
    .maybeSingle<{ status: string }>();
  return data?.status ?? null;
}

/**
 * Resolve the row to act on. With an id, validates it exists and isn't already
 * posted. Without one (admin wrote a tweet from scratch), inserts a fresh draft
 * and returns its id. Returns an error string on failure.
 */
async function resolveRow(
  db: SupabaseClient,
  {
    id,
    body,
    kind,
    sourceUrl,
  }: { id: string; body: string; kind: string; sourceUrl: string | null },
): Promise<{ id: string } | { error: string }> {
  if (id) {
    const status = await loadStatus(db, id);
    if (!status) return { error: "Tweet not found." };
    if (status === "posted") return { error: "Already posted." };
    return { id };
  }
  const { data, error } = await db
    .from("tweets")
    .insert({
      status: "draft",
      kind: VALID_KINDS.has(kind) ? kind : "evergreen",
      body,
      source_url: sourceUrl,
      created_for: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not save tweet." };
  return { id: (data as { id: string }).id };
}

/** Post the (possibly edited or freshly written) tweet to X + Bluesky now. */
export async function approveAndPost(
  _prev: TweetActionState,
  formData: FormData,
): Promise<TweetActionState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const sourceUrl = String(formData.get("source_url") ?? "").trim() || null;
  if (!body) return { error: "The tweet is empty." };
  if (tweetLength(body) > TWEET_MAX) {
    return { error: `Too long — ${tweetLength(body)}/${TWEET_MAX}.` };
  }

  const db = createAdminClient();
  const resolved = await resolveRow(db, { id, body, kind, sourceUrl });
  if ("error" in resolved) return { error: resolved.error };

  const result = await publishTweet(db, {
    id: resolved.id,
    body,
    sourceUrl,
    approvedBy: admin.id,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/tweets");
  return {
    ok: true,
    url: result.xUrl,
    blueskyUrl: result.blueskyUrl,
    warning: result.warning,
  };
}

/** Schedule the (possibly edited) draft to post at a future time. */
export async function scheduleTweet(
  _prev: TweetActionState,
  formData: FormData,
): Promise<TweetActionState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const sourceUrl = String(formData.get("source_url") ?? "").trim() || null;
  const scheduledFor = String(formData.get("scheduled_for") ?? "");
  if (!body) return { error: "The tweet is empty." };
  if (tweetLength(body) > TWEET_MAX) {
    return { error: `Too long — ${tweetLength(body)}/${TWEET_MAX}.` };
  }
  const when = new Date(scheduledFor);
  if (!scheduledFor || Number.isNaN(when.getTime())) {
    return { error: "Pick a date and time." };
  }
  if (when.getTime() < Date.now() - 60_000) {
    return { error: "Pick a time in the future." };
  }

  const db = createAdminClient();
  const resolved = await resolveRow(db, { id, body, kind, sourceUrl });
  if ("error" in resolved) return { error: resolved.error };

  const { error } = await db
    .from("tweets")
    .update({
      status: "scheduled",
      body,
      source_url: sourceUrl,
      scheduled_for: when.toISOString(),
      approved_by: admin.id,
    })
    .eq("id", resolved.id);
  if (error) return { error: error.message };

  revalidatePath("/admin/tweets");
  return { ok: true };
}

/** Discard a draft. */
export async function rejectTweet(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = createAdminClient();
  await db.from("tweets").update({ status: "rejected" }).eq("id", id);
  revalidatePath("/admin/tweets");
}

/**
 * Run a draft cycle on demand. News (HN + Dev.to + ingested Reddit) is always
 * included now that it's a free keyless fetch — each option lands as its own
 * draft row.
 */
export async function generateNow(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prev: TweetActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<TweetActionState> {
  await requireAdmin();
  const result = await draftTweets({ includeNews: true });
  revalidatePath("/admin/tweets");
  if (!result.ok) return { error: result.error };
  return { ok: true };
}
