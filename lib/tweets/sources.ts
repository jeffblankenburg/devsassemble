import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Developer-news sources for tweet drafting: Hacker News (Algolia front page)
// and Dev.to (top articles) — free, keyless, fetched live — plus items pushed
// in by IFTTT (e.g. Reddit, which blocks direct server access). Each source is
// best-effort: one that's down or rate-limiting is skipped, not fatal.

export type NewsItem = {
  source: string;
  title: string;
  url: string;
  score: number;
};

const UA = "DevsAssemble/1.0 (tweet drafting; https://devsassemble.ai)";

async function fetchHackerNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=20",
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      hits: { title: string | null; url: string | null; points: number | null }[];
    };
    return (data.hits ?? [])
      .filter((h) => h.url && h.title)
      .map((h) => ({
        source: "Hacker News",
        title: h.title as string,
        url: h.url as string,
        score: h.points ?? 0,
      }));
  } catch {
    return [];
  }
}

async function fetchDevTo(): Promise<NewsItem[]> {
  try {
    const res = await fetch("https://dev.to/api/articles?top=1&per_page=20", {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      title: string;
      url: string;
      positive_reactions_count: number;
    }[];
    return (data ?? []).map((a) => ({
      source: "Dev.to",
      title: a.title,
      url: a.url,
      score: a.positive_reactions_count ?? 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Items pushed by IFTTT (or any webhook) in the last 48h — the path for Reddit,
 * which blocks direct server access. Score is unknown here (0), so these are
 * surfaced by recency rather than by points.
 */
async function fetchIngested(): Promise<NewsItem[]> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data } = await admin
      .from("news_ingest")
      .select("source, title, url")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);
    return ((data ?? []) as { source: string; title: string; url: string }[]).map(
      (r) => ({ source: r.source, title: r.title, url: r.url, score: 0 }),
    );
  } catch {
    return [];
  }
}

/** Top dev/AI items across HN, Dev.to, and IFTTT-ingested sources (e.g. Reddit). */
export async function fetchDevNews(limit = 24): Promise<NewsItem[]> {
  const batches = await Promise.all([
    fetchHackerNews(),
    fetchDevTo(),
    fetchIngested(),
  ]);
  const all = batches.flat();

  const seen = new Set<string>();
  const deduped = all.filter((i) => {
    const key = i.url.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // The ingested items (Reddit via IFTTT) are our freshest, most on-topic
  // community signal, so give them the lion's share of the budget and list
  // them FIRST — don't let points-sorted HN/Dev.to crowd them out.
  const ingested = deduped.filter((i) => i.score === 0).slice(0, 16);
  const scored = deduped
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit - ingested.length));
  return [...ingested, ...scored];
}

/** Format news items as prompt text. */
export function devNewsToText(items: NewsItem[]): string {
  return items
    .map(
      (i) =>
        `- [${i.source}${i.score > 0 ? ` · ${i.score} pts` : ""}] ${i.title} — ${i.url}`,
    )
    .join("\n");
}
