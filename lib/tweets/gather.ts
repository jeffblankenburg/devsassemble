import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
// Tweet links syndicate off-site — force the prod origin, never localhost.
import { PUBLIC_SITE_URL as SITE_URL } from "@/lib/email/config";
import { upcomingOccurrences } from "@/lib/events/recurrence";
import { formatFullDate, formatTime, tzLabel } from "@/lib/events/format";
import type { EventRow } from "@/lib/events/queries";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A predicate that tells whether a URL has already been covered by any draft,
 * scheduled, or posted tweet — matched against both the stored source_url and
 * the tweet text. Used to avoid re-surfacing the same item run after run.
 */
export async function buildCoveredUrlMatcher(
  admin: SupabaseClient,
): Promise<(url: string) => boolean> {
  const { data } = await admin
    .from("tweets")
    .select("body, source_url")
    .in("status", ["draft", "scheduled", "posted"]);
  const corpus = ((data ?? []) as {
    body: string | null;
    source_url: string | null;
  }[])
    .map((t) => `${t.source_url ?? ""} ${t.body ?? ""}`.toLowerCase())
    .join("\n");
  return (url: string) =>
    corpus.includes(url.replace(/\/$/, "").toLowerCase());
}

const EVENT_COLUMNS =
  "id, slug, title, summary, description, starts_at, ends_at, timezone, location, url, is_virtual, host, accent, status, recurrence, recurrence_until, recurrence_exceptions, rrule, recurrence_count, recurrence_overrides, is_live, stream_embed_url, created_by, created_at, updated_at";

export type TweetMaterial = { text: string; hasContent: boolean };

/**
 * Pull the week's worth of community activity Claude can tweet about — upcoming
 * events, fresh projects/tools, active discussions, and member count. Returns a
 * plain-text brief (with canonical devsassemble.ai links) for the prompt.
 */
export async function gatherTweetMaterial(now = new Date()): Promise<TweetMaterial> {
  const admin = createAdminClient();
  const sinceIso = new Date(now.getTime() - WEEK_MS).toISOString();
  const soonMs = now.getTime() + WEEK_MS;
  const lines: string[] = [];

  // Skip anything we've already drafted, scheduled, or posted — so we don't
  // keep resurfacing the same event/project/tool/discussion run after run.
  const isCovered = await buildCoveredUrlMatcher(admin);

  // Upcoming events (next 7 days), recurring series expanded.
  const { data: eventRows } = await admin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("status", "published");
  const events = ((eventRows ?? []) as EventRow[])
    .flatMap((e) => upcomingOccurrences(e, now, 1))
    .filter((e) => {
      const ms = new Date(e.starts_at).getTime();
      return ms >= now.getTime() && ms <= soonMs;
    })
    .filter((e) => !isCovered(`${SITE_URL}/events/${e.slug}`))
    .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1))
    .slice(0, 3);
  if (events.length) {
    lines.push("UPCOMING EVENTS:");
    for (const e of events) {
      const when = `${formatFullDate(e.starts_at, e.timezone)} at ${formatTime(e.starts_at, e.timezone)} (${tzLabel(e.timezone)})`;
      lines.push(`- "${e.title}" — ${when}${e.is_virtual ? " · online" : ""} — ${SITE_URL}/events/${e.slug}`);
    }
  }

  // Recently shared projects/repos. We link to the project ON OUR SITE (so the
  // tweet pulls people into the community), not out to GitHub — the per-item
  // `?p=<id>` keeps each link unique so dedup still works.
  const { data: repos } = await admin
    .from("repos")
    .select("id, owner, name, description, created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(4);
  const freshRepos = ((repos ?? []) as {
    id: string;
    owner: string;
    name: string;
    description: string | null;
  }[]).filter((r) => !isCovered(`${SITE_URL}/projects/${r.id}`));
  if (freshRepos.length) {
    lines.push("\nNEW PROJECTS (link each to its page on our site):");
    for (const r of freshRepos) {
      lines.push(`- ${r.owner}/${r.name}${r.description ? ` — ${r.description}` : ""} — ${SITE_URL}/projects/${r.id}`);
    }
  }

  // Recently shared tools — link to our site, not the tool's own URL.
  const { data: tools } = await admin
    .from("tools")
    .select("id, name, description, category, created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(4);
  const freshTools = ((tools ?? []) as {
    id: string;
    name: string;
    description: string | null;
    category: string;
  }[]).filter((t) => !isCovered(`${SITE_URL}/tools/${t.id}`));
  if (freshTools.length) {
    lines.push("\nNEW TOOLS (link each to its page on our site):");
    for (const t of freshTools) {
      lines.push(`- ${t.name}${t.description ? ` — ${t.description}` : ""} — ${SITE_URL}/tools/${t.id}`);
    }
  }

  // Active discussions.
  const { data: topics } = await admin
    .from("topics")
    .select("title, slug, reply_count, last_activity_at")
    .gte("last_activity_at", sinceIso)
    .order("reply_count", { ascending: false })
    .limit(3);
  const freshTopics = ((topics ?? []) as {
    title: string;
    slug: string;
    reply_count: number;
  }[]).filter((t) => !isCovered(`${SITE_URL}/discussions/${t.slug}`));
  if (freshTopics.length) {
    lines.push("\nACTIVE DISCUSSIONS:");
    for (const t of freshTopics) {
      lines.push(`- "${t.title}" (${t.reply_count} replies) — ${SITE_URL}/discussions/${t.slug}`);
    }
  }

  // Member milestone context.
  const { count: memberCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (memberCount) {
    lines.push(`\nCOMMUNITY: ${memberCount} members and growing (${SITE_URL}).`);
  }

  return { text: lines.join("\n"), hasContent: lines.length > 0 };
}
