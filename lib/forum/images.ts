import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FORUM_IMAGE_BUCKET,
  extractForumImagePaths,
} from "@/lib/forum/image-constants";

/**
 * Flip the ledger rows for images referenced in `body` to committed, so the
 * abandonment sweep leaves them alone. Best-effort: a failure here must never
 * block the post from being created, it just risks a later false-orphan.
 */
export async function commitForumImages(
  supabase: SupabaseClient,
  body: string,
): Promise<void> {
  const paths = extractForumImagePaths(body);
  if (paths.length === 0) return;
  await supabase
    .from("forum_uploads")
    .update({ committed: true })
    .in("path", paths);
}

/**
 * Every forum-image path still referenced by a live topic or reply body. Used
 * by the sweep to detect orphans (images whose post was later deleted/edited).
 *
 * Correctness matters more than speed here: under-fetching would make a live
 * image look orphaned and get it deleted, so we paginate through EVERY
 * image-bearing body rather than capping the scan. The `ilike` filter keeps it
 * to the small subset of bodies that actually embed an image.
 */
export async function collectReferencedForumImagePaths(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const marker = `%/${FORUM_IMAGE_BUCKET}/%`;
  const refs = new Set<string>();
  const PAGE = 1000;

  for (const table of ["topics", "posts"] as const) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from(table)
        .select("body")
        .ilike("body", marker)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const rows = (data ?? []) as { body: string }[];
      for (const row of rows) {
        for (const path of extractForumImagePaths(row.body)) refs.add(path);
      }
      if (rows.length < PAGE) break;
    }
  }

  return refs;
}
