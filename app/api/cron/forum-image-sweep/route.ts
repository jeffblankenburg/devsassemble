import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FORUM_IMAGE_BUCKET } from "@/lib/forum/image-constants";
import { collectReferencedForumImagePaths } from "@/lib/forum/images";

/**
 * Reclaim forum image uploads that no live post references. Two orphan classes:
 *
 *  1. Abandoned — uploaded from a composer whose post was never submitted, so
 *     the ledger row stayed `committed = false`. Reclaimed after a grace window
 *     (an upload can sit in a draft for a while).
 *  2. Dangling — once referenced, but the topic/reply was later deleted (or
 *     edited to drop the image), so the path no longer appears in any body.
 *
 * Invoked by Vercel Cron (see vercel.json). Vercel sends the CRON_SECRET as a
 * bearer token; we reject anything else so the endpoint can't be triggered by
 * the public.
 */
const GRACE_HOURS = 24;
const BATCH = 500;

type Row = { id: string; path: string };

/** Delete the storage objects + ledger rows for a set of uploads. */
async function reclaim(
  supabase: SupabaseClient,
  rows: Row[],
): Promise<{ error?: string }> {
  if (rows.length === 0) return {};
  const { error: removeError } = await supabase.storage
    .from(FORUM_IMAGE_BUCKET)
    .remove(rows.map((r) => r.path));
  if (removeError) return { error: removeError.message };

  const { error: deleteError } = await supabase
    .from("forum_uploads")
    .delete()
    .in("id", rows.map((r) => r.id));
  if (deleteError) return { error: deleteError.message };
  return {};
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - GRACE_HOURS * 60 * 60 * 1000).toISOString();

  // Phase 1 — abandoned uploads (never committed, past the grace window).
  const { data: stale, error: staleError } = await supabase
    .from("forum_uploads")
    .select("id, path")
    .eq("committed", false)
    .lt("created_at", cutoff)
    .limit(BATCH);
  if (staleError) {
    return Response.json({ error: staleError.message }, { status: 500 });
  }
  const abandoned = (stale ?? []) as Row[];
  const r1 = await reclaim(supabase, abandoned);
  if (r1.error) return Response.json({ error: r1.error }, { status: 500 });

  // Phase 2 — dangling uploads (committed, but no live body still references
  // the path). The grace window also shields a just-committed image from a race
  // with its own post insert. Correctness guard: collectReferenced* paginates
  // every image-bearing body, so a live image is never mistaken for an orphan.
  const referenced = await collectReferencedForumImagePaths(supabase);
  const { data: live, error: liveError } = await supabase
    .from("forum_uploads")
    .select("id, path")
    .eq("committed", true)
    .lt("created_at", cutoff)
    .limit(BATCH);
  if (liveError) {
    return Response.json({ error: liveError.message }, { status: 500 });
  }
  const dangling = ((live ?? []) as Row[]).filter(
    (r) => !referenced.has(r.path),
  );
  const r2 = await reclaim(supabase, dangling);
  if (r2.error) return Response.json({ error: r2.error }, { status: 500 });

  return Response.json({
    abandoned: abandoned.length,
    dangling: dangling.length,
  });
}
