"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { postTweet } from "@/lib/twitter/client";
import { postSkeet } from "@/lib/bluesky/client";
import { draftTweets } from "@/lib/tweets/pipeline";
import { tweetLength, TWEET_MAX } from "@/lib/tweets/length";

export type TweetActionState = {
  ok?: boolean;
  error?: string;
  url?: string;
  blueskyUrl?: string;
  warning?: string;
};

/** Post the (possibly edited) draft to X and mark it posted. Admin/mod only. */
export async function approveAndPost(
  _prev: TweetActionState,
  formData: FormData,
): Promise<TweetActionState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const sourceUrl = String(formData.get("source_url") ?? "").trim() || null;
  if (!id) return { error: "Missing id." };
  if (!body) return { error: "The tweet is empty." };
  if (tweetLength(body) > TWEET_MAX) {
    return { error: `Too long — ${tweetLength(body)}/${TWEET_MAX}.` };
  }

  const db = createAdminClient();
  const { data: row } = await db
    .from("tweets")
    .select("status")
    .eq("id", id)
    .maybeSingle<{ status: string }>();
  if (!row) return { error: "Draft not found." };
  if (row.status === "posted") return { error: "Already posted." };

  // Cross-post to both platforms; one failing doesn't block the other.
  const [x, bsky] = await Promise.all([postTweet(body), postSkeet(body)]);
  if (!x.ok && !bsky.ok) {
    return { error: `Both platforms failed. X: ${x.error} · Bluesky: ${bsky.error}` };
  }

  const { error } = await db
    .from("tweets")
    .update({
      status: "posted",
      body,
      source_url: sourceUrl,
      posted_tweet_id: x.ok ? x.id : null,
      posted_url: x.ok ? x.url || null : null,
      bluesky_uri: bsky.ok ? bsky.uri : null,
      bluesky_url: bsky.ok ? bsky.url || null : null,
      posted_at: new Date().toISOString(),
      approved_by: admin.id,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  // Surface a partial failure (one platform down) without blocking success.
  let warning: string | undefined;
  if (!x.ok) warning = `Posted to Bluesky only — X failed: ${x.error}`;
  else if (!bsky.ok) warning = `Posted to X only — Bluesky failed: ${bsky.error}`;

  revalidatePath("/admin/tweets");
  return {
    ok: true,
    url: x.ok ? x.url || undefined : undefined,
    blueskyUrl: bsky.ok ? bsky.url || undefined : undefined,
    warning,
  };
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

/** Run a draft cycle on demand (same pipeline the daily cron uses). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateNow(_prev: TweetActionState, _formData: FormData): Promise<TweetActionState> {
  await requireAdmin();
  const result = await draftTweets();
  revalidatePath("/admin/tweets");
  if (!result.ok) return { error: result.error };
  return { ok: true };
}
