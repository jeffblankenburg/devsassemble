import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { postTweet } from "@/lib/twitter/client";
import { postSkeet } from "@/lib/bluesky/client";

export type PublishResult =
  | { ok: true; xUrl?: string; blueskyUrl?: string; warning?: string }
  | { ok: false; error: string };

/**
 * Cross-post `body` to X + Bluesky and mark the tweet row posted. One platform
 * failing doesn't block the other; only both failing is an error. Shared by the
 * manual "approve & post" action and the scheduled-publish cron.
 */
export async function publishTweet(
  db: SupabaseClient,
  opts: {
    id: string;
    body: string;
    sourceUrl: string | null;
    approvedBy?: string | null;
  },
): Promise<PublishResult> {
  const [x, bsky] = await Promise.all([postTweet(opts.body), postSkeet(opts.body)]);
  if (!x.ok && !bsky.ok) {
    return {
      ok: false,
      error: `Both platforms failed. X: ${x.error} · Bluesky: ${bsky.error}`,
    };
  }

  const update: Record<string, unknown> = {
    status: "posted",
    body: opts.body,
    source_url: opts.sourceUrl,
    posted_tweet_id: x.ok ? x.id : null,
    posted_url: x.ok ? x.url || null : null,
    bluesky_uri: bsky.ok ? bsky.uri : null,
    bluesky_url: bsky.ok ? bsky.url || null : null,
    posted_at: new Date().toISOString(),
    scheduled_for: null,
  };
  // Only set approver when provided (the cron preserves the scheduler's id).
  if (opts.approvedBy) update.approved_by = opts.approvedBy;

  const { error } = await db.from("tweets").update(update).eq("id", opts.id);
  if (error) return { ok: false, error: error.message };

  let warning: string | undefined;
  if (!x.ok) warning = `Posted to Bluesky only — X failed: ${x.error}`;
  else if (!bsky.ok) warning = `Posted to X only — Bluesky failed: ${bsky.error}`;

  return {
    ok: true,
    xUrl: x.ok ? x.url || undefined : undefined,
    blueskyUrl: bsky.ok ? bsky.url || undefined : undefined,
    warning,
  };
}
