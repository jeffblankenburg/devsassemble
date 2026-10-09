import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { gatherTweetMaterial } from "@/lib/tweets/gather";
import {
  generateTweetOptions,
  fetchAiNewsDigest,
  type TweetOption,
} from "@/lib/ai/tweets";

export type DraftResult =
  | { ok: true; id: string; optionCount: number; preview: string }
  | { ok: false; error: string };

/**
 * One draft cycle: gather the week's community material, pull a best-effort news
 * digest, ask Claude for 2-3 options, and store them as a single `draft` row
 * (top option as the body, the rest as alternatives). Shared by the daily cron
 * and the "Generate now" admin button. Never posts — approval happens in the UI.
 */
export async function draftTweets(now = new Date()): Promise<DraftResult> {
  const material = await gatherTweetMaterial(now);
  const news = await fetchAiNewsDigest();

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

  const [primary, ...rest] = options;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tweets")
    .insert({
      status: "draft",
      kind: primary.kind,
      body: primary.body,
      source_url: primary.source_url,
      rationale: primary.rationale,
      alternatives: rest,
      created_for: now.toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    id: (data as { id: string }).id,
    optionCount: options.length,
    preview: primary.body,
  };
}
