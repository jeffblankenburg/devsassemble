"use server";

import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/net/rate-limit";
import { normalizeUrl } from "@/lib/links/extract";
import { resolveAndStore } from "@/lib/links/unfurl";
import type { LinkPreview } from "@/lib/links/constants";

export type PreviewLinkResult = { preview?: LinkPreview; error?: string };

const PREVIEW_COLS =
  "id, url, kind, title, description, site_name, author, image_url, status";

// Per-user cap on live unfurls from the composer. The hard SSRF protection is
// in safeFetch; this just dampens someone using the preview action to probe or
// hammer third parties through our server.
const PREVIEW_LIMIT = 10;
const PREVIEW_WINDOW_MS = 60_000;

type PreviewRow = LinkPreview & { status: string };

function toPreview(row: PreviewRow): LinkPreview {
  return {
    id: row.id,
    url: row.url,
    kind: row.kind,
    title: row.title,
    description: row.description,
    site_name: row.site_name,
    author: row.author,
    image_url: row.image_url,
  };
}

/**
 * Resolve a link preview on demand for the composer's Preview tab. Returns a
 * cached preview instantly when one exists; otherwise (rate permitting) unfurls
 * the URL through the same SSRF-safe pipeline as post-time unfurling, warming
 * the cache so the published post renders its card with no delay.
 */
export async function previewLink(rawUrl: string): Promise<PreviewLinkResult> {
  const user = await requireUser();

  const url = normalizeUrl(rawUrl);
  if (!url) return { error: "That doesn't look like a link." };

  const admin = createAdminClient();

  // Cache hit → return immediately. No network, no rate-limit spend.
  const cached = await admin
    .from("link_previews")
    .select(PREVIEW_COLS)
    .eq("url", url)
    .eq("status", "ok")
    .maybeSingle<PreviewRow>();
  if (cached.data) return { preview: toPreview(cached.data) };

  // About to hit the network — enforce the per-user limit.
  const limit = rateLimit(`link-preview:${user.id}`, {
    limit: PREVIEW_LIMIT,
    windowMs: PREVIEW_WINDOW_MS,
  });
  if (!limit.ok) {
    return { error: "Too many link previews — give it a few seconds." };
  }

  // Ensure a row exists (don't clobber an existing one), then resolve into it.
  await admin
    .from("link_previews")
    .upsert({ url, status: "pending" }, { onConflict: "url", ignoreDuplicates: true });
  await resolveAndStore(admin, url);

  const resolved = await admin
    .from("link_previews")
    .select(PREVIEW_COLS)
    .eq("url", url)
    .maybeSingle<PreviewRow>();
  if (resolved.data?.status === "ok") return { preview: toPreview(resolved.data) };
  return { error: "No preview available for that link." };
}
