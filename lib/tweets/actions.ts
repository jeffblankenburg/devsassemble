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

/** Post the (possibly edited) draft to X + Bluesky now. Admin/mod only. */
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
  const status = await loadStatus(db, id);
  if (!status) return { error: "Draft not found." };
  if (status === "posted") return { error: "Already posted." };

  const result = await publishTweet(db, {
    id,
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
  const sourceUrl = String(formData.get("source_url") ?? "").trim() || null;
  const scheduledFor = String(formData.get("scheduled_for") ?? "");
  if (!id) return { error: "Missing id." };
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
  const status = await loadStatus(db, id);
  if (!status) return { error: "Draft not found." };
  if (status === "posted") return { error: "Already posted." };

  const { error } = await db
    .from("tweets")
    .update({
      status: "scheduled",
      body,
      source_url: sourceUrl,
      scheduled_for: when.toISOString(),
      approved_by: admin.id,
    })
    .eq("id", id);
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
