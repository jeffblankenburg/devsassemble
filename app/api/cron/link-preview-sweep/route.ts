import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LINK_PREVIEW_BUCKET } from "@/lib/links/constants";
import { resolveAndStore } from "@/lib/links/unfurl";

/**
 * Maintenance for link previews. Two jobs:
 *
 *  1. Refresh — re-resolve the oldest successfully-cached previews so titles,
 *     images, and (importantly) dead links don't rot, and retry failed ones in
 *     case the source was briefly down. Bounded per run to stay well under the
 *     function timeout; the backlog drains over successive runs.
 *  2. Reclaim — delete re-hosted images no live preview row references. These
 *     arise when a refresh resolves a URL that no longer has an image (the
 *     object path is deterministic per URL, so a refresh that still has an
 *     image overwrites in place and never orphans).
 *
 * Invoked by Vercel Cron (see vercel.json). Auth mirrors the forum image sweep:
 * Vercel sends CRON_SECRET as a bearer token; anything else is rejected.
 */
const REFRESH_OK_AFTER_DAYS = 30;
const REFRESH_ERROR_AFTER_DAYS = 7;
const REFRESH_BATCH = 25;
const RECLAIM_GRACE_MS = 60 * 60 * 1000; // 1h — don't race a fresh upload.
const PAGE = 100;

/** Every image_path still referenced by a live preview row. */
async function referencedPaths(supabase: SupabaseClient): Promise<Set<string>> {
  const refs = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("link_previews")
      .select("image_path")
      .not("image_path", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { image_path: string }[];
    for (const row of rows) refs.add(row.image_path);
    if (rows.length < PAGE) break;
  }
  return refs;
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
  const now = Date.now();
  const okCutoff = new Date(now - REFRESH_OK_AFTER_DAYS * 86400_000).toISOString();
  const errCutoff = new Date(now - REFRESH_ERROR_AFTER_DAYS * 86400_000).toISOString();

  // Phase 1 — refresh the stalest previews. Errored rows get retried sooner
  // (7d) than successful ones are re-checked (30d). Two simple queries rather
  // than a nested PostgREST or()/and() filter, which is brittle with ISO
  // timestamps (the '.' in millis collides with the operator separator).
  const stale = new Map<string, true>();

  const { data: errRows, error: errError } = await supabase
    .from("link_previews")
    .select("url")
    .eq("status", "error")
    .lt("fetched_at", errCutoff)
    .order("fetched_at", { ascending: true, nullsFirst: true })
    .limit(REFRESH_BATCH);
  if (errError) {
    return Response.json({ error: errError.message }, { status: 500 });
  }
  for (const row of (errRows ?? []) as { url: string }[]) stale.set(row.url, true);

  if (stale.size < REFRESH_BATCH) {
    const { data: okRows, error: okError } = await supabase
      .from("link_previews")
      .select("url")
      .eq("status", "ok")
      .lt("fetched_at", okCutoff)
      .order("fetched_at", { ascending: true, nullsFirst: true })
      .limit(REFRESH_BATCH - stale.size);
    if (okError) {
      return Response.json({ error: okError.message }, { status: 500 });
    }
    for (const row of (okRows ?? []) as { url: string }[]) stale.set(row.url, true);
  }

  for (const url of stale.keys()) {
    await resolveAndStore(supabase, url);
  }
  const refreshed = stale.size;

  // Phase 2 — reclaim orphaned re-hosted images.
  const referenced = await referencedPaths(supabase);
  const orphans: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(LINK_PREVIEW_BUCKET)
      .list("", { limit: PAGE, offset });
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    const objects = data ?? [];
    for (const obj of objects) {
      if (referenced.has(obj.name)) continue;
      // Grace window: skip objects uploaded very recently (race with an
      // in-flight resolve that hasn't written its image_path yet).
      const stamp = obj.updated_at ?? obj.created_at;
      if (stamp && now - new Date(stamp).getTime() < RECLAIM_GRACE_MS) continue;
      orphans.push(obj.name);
    }
    if (objects.length < PAGE) break;
  }
  if (orphans.length > 0) {
    await supabase.storage.from(LINK_PREVIEW_BUCKET).remove(orphans);
  }

  return Response.json({
    refreshed,
    reclaimed: orphans.length,
  });
}
