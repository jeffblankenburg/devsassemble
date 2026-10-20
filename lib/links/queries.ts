import "server-only";

import { createClient } from "@/lib/supabase/server";
import { extractBareUrls } from "@/lib/links/extract";
import type { LinkPreview } from "@/lib/links/constants";

export type { LinkPreview };

/**
 * Fetch resolved previews for a set of post bodies in ONE query. Extracts the
 * bare URLs from every body, looks up the cache for successfully-resolved rows,
 * and returns a url → preview map. A cache miss (pending/error/absent) simply
 * isn't in the map, so the UI falls back to the plain markdown link.
 */
export async function getLinkPreviewsForBodies(
  bodies: string[],
): Promise<Map<string, LinkPreview>> {
  const urls = new Set<string>();
  for (const body of bodies) {
    for (const url of extractBareUrls(body)) urls.add(url);
  }
  if (urls.size === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("link_previews")
    .select("id, url, kind, title, description, site_name, author, image_url")
    .in("url", [...urls])
    .eq("status", "ok");
  if (error) return new Map();

  const map = new Map<string, LinkPreview>();
  for (const row of (data ?? []) as LinkPreview[]) map.set(row.url, row);
  return map;
}
