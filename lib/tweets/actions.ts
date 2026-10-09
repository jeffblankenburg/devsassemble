"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishTweet } from "@/lib/tweets/publish";
import { draftTweets } from "@/lib/tweets/pipeline";
import { tweetLength, TWEET_MAX } from "@/lib/tweets/length";
import type { TweetAlternative } from "@/lib/tweets/queries";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TweetActionState = {
  ok?: boolean;
  error?: string;
  url?: string;
  blueskyUrl?: string;
  warning?: string;
};

type DraftRow = {
  status: string;
  kind: string;
  body: string;
  source_url: string | null;
  alternatives: TweetAlternative[];
};

/**
 * Keep the un-chosen options from a batch as their own drafts, so "post/schedule
 * one, the rest wait in drafts" works. Excludes whichever body was chosen.
 */
async function spawnLeftoverDrafts(
  db: SupabaseClient,
  row: DraftRow,
  chosenBody: string,
): Promise<void> {
  const chosen = chosenBody.trim();
  const leftover = [
    { kind: row.kind, body: row.body, source_url: row.source_url, rationale: null },
    ...(row.alternatives ?? []),
  ].filter((o) => (o.body ?? "").trim().length > 0 && o.body.trim() !== chosen);
  if (leftover.length === 0) return;
  await db.from("tweets").insert(
    leftover.map((o) => ({
      status: "draft",
      kind: o.kind,
      body: o.body,
      source_url: o.source_url ?? null,
      rationale: o.rationale ?? null,
      alternatives: [],
    })),
  );
}

async function loadDraft(
  db: SupabaseClient,
  id: string,
): Promise<DraftRow | null> {
  const { data } = await db
    .from("tweets")
    .select("status, kind, body, source_url, alternatives")
    .eq("id", id)
    .maybeSingle<DraftRow>();
  return data ?? null;
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
  const row = await loadDraft(db, id);
  if (!row) return { error: "Draft not found." };
  if (row.status === "posted") return { error: "Already posted." };

  const result = await publishTweet(db, {
    id,
    body,
    sourceUrl,
    approvedBy: admin.id,
  });
  if (!result.ok) return { error: result.error };

  await spawnLeftoverDrafts(db, row, body);

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
  const row = await loadDraft(db, id);
  if (!row) return { error: "Draft not found." };
  if (row.status === "posted") return { error: "Already posted." };

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

  await spawnLeftoverDrafts(db, row, body);

  revalidatePath("/admin/tweets");
  return { ok: true };
}

/** Move a scheduled tweet back to drafts (cancel the schedule). */
export async function unscheduleTweet(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = createAdminClient();
  await db
    .from("tweets")
    .update({ status: "draft", scheduled_for: null })
    .eq("id", id);
  revalidatePath("/admin/tweets");
}

/** Publish a scheduled tweet immediately. */
export async function postScheduledNow(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = createAdminClient();
  const { data: row } = await db
    .from("tweets")
    .select("status, body, source_url")
    .eq("id", id)
    .maybeSingle<{ status: string; body: string; source_url: string | null }>();
  if (!row || row.status === "posted") return;
  await publishTweet(db, {
    id,
    body: row.body,
    sourceUrl: row.source_url,
    approvedBy: admin.id,
  });
  revalidatePath("/admin/tweets");
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

/** Run a draft cycle on demand. News (HN/Reddit/Dev.to) is opt-in via a toggle. */
export async function generateNow(
  _prev: TweetActionState,
  formData: FormData,
): Promise<TweetActionState> {
  await requireAdmin();
  const includeNews = formData.get("include_news") === "on";
  const result = await draftTweets({ includeNews });
  revalidatePath("/admin/tweets");
  if (!result.ok) return { error: result.error };
  return { ok: true };
}
