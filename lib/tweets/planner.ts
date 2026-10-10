import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { gatherTweetMaterial, buildCoveredUrlMatcher } from "@/lib/tweets/gather";
import { fetchDevNews, devNewsToText } from "@/lib/tweets/sources";
import { ensureSourceLink } from "@/lib/tweets/pipeline";
import { planTweets } from "@/lib/ai/tweets";
import { tweetLength, TWEET_MAX } from "@/lib/tweets/length";
import { getZonedParts, zonedWallClockToUtcIso } from "@/lib/events/format";
import { getAutopilot } from "@/lib/settings";

// Autopilot cadence: ~10 tweets/day spread across an Eastern daytime window.
const TZ = "America/New_York";
const WINDOW_START_HOUR = 8; // 8am ET
const WINDOW_END_HOUR = 22; // 10pm ET
const DAILY_COUNT = 10;

export type PlanResult =
  | { ok: true; planned: number; mode: string; batchDate: string }
  | { ok: false; error: string; skipped?: boolean };

/** The ET calendar date ("YYYY-MM-DD") for an instant. */
function etDate(now: Date): string {
  const p = getZonedParts(now.toISOString(), TZ);
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * `count` posting times evenly spread across the daily window on `date` (ET),
 * returned as UTC ISO strings. Slots that have already passed are dropped.
 */
function computeSlots(date: string, count: number, now: Date): string[] {
  const startMin = WINDOW_START_HOUR * 60;
  const span = (WINDOW_END_HOUR - WINDOW_START_HOUR) * 60;
  const slots: string[] = [];
  for (let i = 0; i < count; i++) {
    const min = Math.round(startMin + (span * (i + 0.5)) / count);
    const hh = String(Math.floor(min / 60)).padStart(2, "0");
    const mm = String(min % 60).padStart(2, "0");
    const iso = zonedWallClockToUtcIso(`${date}T${hh}:${mm}`, TZ);
    if (iso && new Date(iso).getTime() > now.getTime()) slots.push(iso);
  }
  return slots;
}

/**
 * Plan one day's batch: gather deduped community + news material, ask Claude for
 * ~10 distinct enthusiastic tweets, enforce the source link, and insert them
 * with pre-assigned time slots. In "supervised" mode they land as `draft`
 * (await admin approval); in "auto" mode they land as `scheduled` directly.
 * Idempotent per ET day. Never posts — the publish cron does that.
 */
export async function planDay(opts?: {
  now?: Date;
  count?: number;
}): Promise<PlanResult> {
  const now = opts?.now ?? new Date();
  const settings = await getAutopilot();
  if (!settings.enabled) {
    return { ok: false, error: "Autopilot is paused.", skipped: true };
  }

  const admin = createAdminClient();
  const batchDate = etDate(now);

  // Don't plan the same day twice.
  const { count: existing } = await admin
    .from("tweets")
    .select("id", { count: "exact", head: true })
    .eq("batch_date", batchDate);
  if (existing && existing > 0) {
    return {
      ok: false,
      error: `Already planned ${existing} for ${batchDate}.`,
      skipped: true,
    };
  }

  const count = opts?.count ?? DAILY_COUNT;

  // Candidate pool — site material already dedups covered items; dedup news too.
  const material = await gatherTweetMaterial(now);
  const isCovered = await buildCoveredUrlMatcher(admin);
  const news = (await fetchDevNews(40)).filter((i) => !isCovered(i.url));
  const newsText = news.length ? devNewsToText(news) : null;

  let options;
  try {
    options = await planTweets({ material: material.text, news: newsText, count });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Generation failed.",
    };
  }
  if (!options.length) return { ok: false, error: "No tweets were generated." };

  // Enforce the link, drop over-length, and guard against intra-batch and
  // already-covered duplicate links.
  const seen = new Set<string>();
  const clean = options
    .map((o) => ({ ...o, body: ensureSourceLink(o.body, o.source_url) }))
    .filter((o) => {
      if (!o.body.trim() || tweetLength(o.body) > TWEET_MAX) return false;
      const key = (o.source_url ?? "").replace(/\/$/, "").toLowerCase();
      if (key) {
        if (seen.has(key) || isCovered(o.source_url as string)) return false;
        seen.add(key);
      }
      return true;
    });
  if (!clean.length) return { ok: false, error: "Nothing passed the checks." };

  const slots = computeSlots(batchDate, Math.min(clean.length, count), now);
  if (!slots.length) return { ok: false, error: "No posting slots left today." };

  const status = settings.mode === "auto" ? "scheduled" : "draft";
  const rows = clean.slice(0, slots.length).map((o, i) => ({
    status,
    kind: o.kind,
    body: o.body,
    source_url: o.source_url,
    rationale: o.rationale,
    created_for: batchDate,
    batch_date: batchDate,
    scheduled_for: slots[i],
  }));

  const { error } = await admin.from("tweets").insert(rows);
  if (error) return { ok: false, error: error.message };

  return { ok: true, planned: rows.length, mode: settings.mode, batchDate };
}
