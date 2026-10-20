import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { LinkPreviewKind } from "@/lib/links/constants";

// Admin-only reads (link_clicks is service-only; RLS blocks everyone else).
// Gate the calling page with requireCapability("view_insights").

export type ClickTotals = { total: number; last7d: number };

export type TopClickedLink = {
  id: string;
  url: string;
  title: string | null;
  kind: LinkPreviewKind;
  site_name: string | null;
  image_url: string | null;
  click_count: number;
};

export type RecentClick = {
  created_at: string;
  title: string | null;
  url: string;
  kind: LinkPreviewKind;
  topic: { slug: string; title: string } | null;
  user: { username: string | null; display_name: string | null } | null;
};

export async function getClickTotals(): Promise<ClickTotals> {
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [all, recent] = await Promise.all([
    admin.from("link_clicks").select("id", { count: "exact", head: true }),
    admin
      .from("link_clicks")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
  ]);
  return { total: all.count ?? 0, last7d: recent.count ?? 0 };
}

/** Most-clicked links, by the maintained click_count on link_previews. */
export async function getTopClickedLinks(
  limit = 20,
): Promise<TopClickedLink[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("link_previews")
    .select("id, url, title, kind, site_name, image_url, click_count")
    .gt("click_count", 0)
    .order("click_count", { ascending: false })
    .limit(limit);
  return (data ?? []) as TopClickedLink[];
}

/** The latest individual clicks, with source discussion + who clicked. */
export async function getRecentClicks(limit = 25): Promise<RecentClick[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("link_clicks")
    .select(
      "created_at, link_preview:link_previews ( title, url, kind ), topic:topics ( slug, title ), user:profiles ( username, display_name )",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  type Row = {
    created_at: string;
    link_preview: { title: string | null; url: string; kind: LinkPreviewKind } | null;
    topic: { slug: string; title: string } | null;
    user: { username: string | null; display_name: string | null } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.link_preview)
    .map((r) => ({
      created_at: r.created_at,
      title: r.link_preview!.title,
      url: r.link_preview!.url,
      kind: r.link_preview!.kind,
      topic: r.topic,
      user: r.user,
    }));
}
