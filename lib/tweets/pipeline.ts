import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { gatherTweetMaterial } from "@/lib/tweets/gather";
import { fetchDevNews, devNewsToText } from "@/lib/tweets/sources";
import { generateTweetOptions, type TweetOption } from "@/lib/ai/tweets";
import { tweetLength, TWEET_MAX } from "@/lib/tweets/length";

export type DraftResult =
  | { ok: true; id: string; optionCount: number; preview: string }
  | { ok: false; error: string };

/**
 * Guarantee the source link is actually in the posted text — Claude often keeps
 * it only as metadata, which would ship a link-less tweet and waste the whole
 * point (driving traffic + getting the cited account to notice). If the url is
 * already present we leave it; otherwise we append it, trimming the body on a
 * word boundary only if needed to stay under 280.
 */
export function ensureSourceLink(body: string, url: string | null): string {
  if (!url) return body;
  const base = body.trim();
  if (base.includes(url)) return base;

  const suffix = `\n\n${url}`;
  if (tweetLength(base + suffix) <= TWEET_MAX) return base + suffix;

  // Too long with the link — trim trailing words until it fits.
  const words = base.split(/\s+/);
  while (words.length > 1) {
    words.pop();
    const trimmed = words.join(" ") + "…";
    if (tweetLength(trimmed + suffix) <= TWEET_MAX) return trimmed + suffix;
  }
  return base + suffix;
}

/**
 * One draft cycle: gather the week's community material, pull a dev-news digest
 * (HN + Dev.to + IFTTT-ingested Reddit), ask Claude for 2-3 options, and store
 * EACH option as its own `draft` row — a flat queue, no nested "alternatives".
 * Shared by the daily cron and the "Generate now" admin button. Never posts —
 * approval happens in the UI.
 *
 * News is on by default now that it's a free keyless fetch (no web search). Pass
 * `includeNews: false` only to skip it deliberately.
 */
export async function draftTweets(opts?: {
  includeNews?: boolean;
  now?: Date;
}): Promise<DraftResult> {
  const now = opts?.now ?? new Date();
  const includeNews = opts?.includeNews !== false;
  const material = await gatherTweetMaterial(now);
  let news: string | null = null;
  if (includeNews) {
    const items = await fetchDevNews();
    news = items.length ? devNewsToText(items) : null;
  }

  let options: TweetOption[] = [];
  try {
    options = await generateTweetOptions(material.text, news);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Generation failed.",
    };
  }
  if (options.length === 0) {
    return { ok: false, error: "No tweet options were generated." };
  }

  const admin = createAdminClient();
  const createdFor = now.toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("tweets")
    .insert(
      options.map((o) => ({
        status: "draft",
        kind: o.kind,
        body: ensureSourceLink(o.body, o.source_url),
        source_url: o.source_url,
        rationale: o.rationale,
        created_for: createdFor,
      })),
    )
    .select("id");

  if (error) return { ok: false, error: error.message };
  const rows = (data ?? []) as { id: string }[];
  return {
    ok: true,
    id: rows[0]?.id ?? "",
    optionCount: options.length,
    preview: options[0].body,
  };
}
