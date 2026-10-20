import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractBareUrls } from "@/lib/links/extract";
import { resolveMeta, rehostImage } from "@/lib/links/resolve";

const TITLE_MAX = 300;
const DESCRIPTION_MAX = 600;

function clamp(value: string | null, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/**
 * Resolve metadata for one URL, re-host its image, and write the result onto
 * the existing link_previews row (matched by url). Best-effort: on any failure
 * it records status 'error' rather than throwing, so a caller iterating many
 * URLs never aborts mid-batch. The row MUST already exist.
 */
export async function resolveAndStore(
  admin: SupabaseClient,
  url: string,
): Promise<void> {
  try {
    const meta = await resolveMeta(url);
    if (!meta) {
      await admin
        .from("link_previews")
        .update({
          status: "error",
          error: "No preview metadata",
          fetched_at: new Date().toISOString(),
        })
        .eq("url", url);
      return;
    }

    const image = meta.imageSourceUrl
      ? await rehostImage(admin, meta.imageSourceUrl, url)
      : null;

    await admin
      .from("link_previews")
      .update({
        status: "ok",
        kind: meta.kind,
        provider: meta.provider,
        title: clamp(meta.title, TITLE_MAX),
        description: clamp(meta.description, DESCRIPTION_MAX),
        site_name: clamp(meta.siteName, 120),
        author: clamp(meta.author, 120),
        image_url: image?.imageUrl ?? null,
        image_path: image?.imagePath ?? null,
        error: null,
        fetched_at: new Date().toISOString(),
      })
      .eq("url", url);
  } catch (err) {
    console.error("[unfurl] failed for", url, err);
    await admin
      .from("link_previews")
      .update({
        status: "error",
        error: err instanceof Error ? err.message.slice(0, 300) : "Unfurl failed",
        fetched_at: new Date().toISOString(),
      })
      .eq("url", url);
  }
}

/**
 * Resolve link previews for every bare URL in a freshly-posted body. Designed
 * to run in the background via next/after — best-effort and NEVER throws.
 * Claims each URL by inserting a pending row (a unique-violation means it's
 * already cached or being resolved elsewhere, so we skip the refetch), then
 * resolves it. Uses the service-key client because link_previews has no
 * member-write RLS policy (members can't forge preview rows).
 */
export async function unfurlPost(body: string): Promise<void> {
  const urls = extractBareUrls(body);
  if (urls.length === 0) return;

  const admin = createAdminClient();
  for (const url of urls) {
    const { data, error } = await admin
      .from("link_previews")
      .insert({ url, status: "pending" })
      .select("id")
      .maybeSingle();
    if (error || !data) continue; // 23505 conflict or claim failed → skip
    await resolveAndStore(admin, url);
  }
}
