import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type NewsMeta = { title: string; source: string | null };

/**
 * Titles for source URLs from our own captured-news table. Reddit (and some
 * other hosts) block server-side scraping, but we already recorded the real
 * post title + subreddit when it was ingested — so this is the reliable way to
 * show "specifics" on the feed without fetching anything external. Keyed by the
 * exact source URL (the tweet pipeline stores the clean URL that matches here).
 */
export async function getNewsForUrls(
  urls: string[],
): Promise<Map<string, NewsMeta>> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("news_ingest")
    .select("url, title, source")
    .in("url", unique);
  if (error) return new Map();

  const map = new Map<string, NewsMeta>();
  for (const row of (data ?? []) as {
    url: string;
    title: string;
    source: string | null;
  }[]) {
    if (!map.has(row.url)) map.set(row.url, { title: row.title, source: row.source });
  }
  return map;
}
