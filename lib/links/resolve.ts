import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeFetch, UnsafeUrlError } from "@/lib/net/safe-fetch";
import { LINK_PREVIEW_BUCKET, type LinkPreviewKind } from "@/lib/links/constants";

/** What a resolver produces, before the image is re-hosted. */
export type ResolvedMeta = {
  kind: LinkPreviewKind;
  provider: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  author: string | null;
  /** Absolute URL of the source image, still on the third-party host. */
  imageSourceUrl: string | null;
};

const HTML_MAX_BYTES = 1024 * 1024; // 1 MB of HTML is plenty for a <head>.
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  // SVG is deliberately excluded — it can carry script and is an XSS vector.
};

// ---------------------------------------------------------------------------
// HTML metadata parsing (bounded, dependency-free)
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .trim();
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = re.exec(tag);
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? null;
}

/**
 * Pull Open Graph / Twitter-card / fallback metadata out of an HTML document.
 * Regex-based rather than a full DOM parse: we only read <meta> tags and the
 * <title>, the input is byte-capped upstream, and the values are rendered as
 * React text (never HTML), so a mis-parse degrades the card — it can't inject.
 */
function parseHtmlMeta(html: string): Map<string, string> {
  const meta = new Map<string, string>();
  // Only scan the head; stop at </head> or the first 200 KB, whichever is first.
  const headEnd = html.search(/<\/head>/i);
  const scope = html.slice(0, headEnd >= 0 ? headEnd : Math.min(html.length, 200_000));

  for (const m of scope.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const key = (attr(tag, "property") ?? attr(tag, "name"))?.toLowerCase();
    const content = attr(tag, "content");
    if (key && content && !meta.has(key)) meta.set(key, decodeEntities(content));
  }

  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(scope);
  if (title && !meta.has("__title")) meta.set("__title", decodeEntities(title[1]));

  return meta;
}

function pick(meta: Map<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = meta.get(key);
    if (value) return value;
  }
  return null;
}

function kindFromOgType(ogType: string | null): LinkPreviewKind {
  if (!ogType) return "link";
  const t = ogType.toLowerCase();
  if (t.startsWith("video")) return "video";
  if (t.startsWith("article")) return "article";
  return "link";
}

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

function isYouTube(url: URL): boolean {
  const h = url.hostname.replace(/^www\./, "");
  return h === "youtube.com" || h === "youtu.be" || h === "m.youtube.com";
}

/** YouTube exposes a public oEmbed endpoint — richer and more reliable than OG. */
async function resolveYouTube(normalizedUrl: string): Promise<ResolvedMeta | null> {
  const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
    normalizedUrl,
  )}`;
  const res = await safeFetch(endpoint, {
    acceptTypes: ["application/json", "text/javascript"],
    timeoutMs: FETCH_TIMEOUT_MS,
    maxBytes: 64 * 1024,
  });
  let data: {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
    provider_name?: string;
  };
  try {
    data = JSON.parse(new TextDecoder().decode(res.body));
  } catch {
    return null;
  }
  return {
    kind: "video",
    provider: "youtube",
    title: data.title ?? null,
    description: null,
    siteName: data.provider_name ?? "YouTube",
    author: data.author_name ?? null,
    imageSourceUrl: data.thumbnail_url ?? null,
  };
}

/** Generic Open Graph / Twitter-card scrape — the fallback for every host. */
async function resolveOpenGraph(normalizedUrl: string): Promise<ResolvedMeta | null> {
  const res = await safeFetch(normalizedUrl, {
    acceptTypes: ["text/html", "application/xhtml+xml"],
    timeoutMs: FETCH_TIMEOUT_MS,
    maxBytes: HTML_MAX_BYTES,
  });
  const html = new TextDecoder("utf-8").decode(res.body);
  const meta = parseHtmlMeta(html);

  const title = pick(meta, "og:title", "twitter:title", "__title");
  const description = pick(meta, "og:description", "twitter:description", "description");
  if (!title && !description) return null; // nothing worth showing

  const rawImage = pick(meta, "og:image:secure_url", "og:image", "twitter:image");
  let imageSourceUrl: string | null = null;
  if (rawImage) {
    try {
      imageSourceUrl = new URL(rawImage, res.finalUrl).toString();
    } catch {
      imageSourceUrl = null;
    }
  }

  return {
    kind: kindFromOgType(pick(meta, "og:type")),
    provider: "opengraph",
    title,
    description,
    siteName: pick(meta, "og:site_name") ?? new URL(res.finalUrl).hostname.replace(/^www\./, ""),
    author: pick(meta, "article:author", "twitter:creator"),
    imageSourceUrl,
  };
}

/** Resolve metadata for one normalized URL. Returns null if nothing usable. */
export async function resolveMeta(normalizedUrl: string): Promise<ResolvedMeta | null> {
  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    return null;
  }
  if (isYouTube(parsed)) {
    const yt = await resolveYouTube(normalizedUrl);
    if (yt) return yt;
    // Fall through to OG if oEmbed failed (e.g. age-gated video).
  }
  return resolveOpenGraph(normalizedUrl);
}

// ---------------------------------------------------------------------------
// Image re-hosting
// ---------------------------------------------------------------------------

/**
 * Download a preview image through the SSRF-safe fetcher and store it in our
 * own bucket, returning the public URL + object path. Returns null on any
 * problem — a preview without an image is fine, a hot-linked or unsafe one
 * is not. The object path is deterministic (hash of the preview URL) so a
 * later refresh overwrites in place instead of leaking orphans.
 */
export async function rehostImage(
  admin: SupabaseClient,
  imageSourceUrl: string,
  previewUrl: string,
): Promise<{ imageUrl: string; imagePath: string } | null> {
  let res;
  try {
    res = await safeFetch(imageSourceUrl, {
      acceptTypes: ["image/"],
      timeoutMs: FETCH_TIMEOUT_MS,
      maxBytes: IMAGE_MAX_BYTES,
    });
  } catch (err) {
    if (err instanceof UnsafeUrlError) return null;
    throw err;
  }

  const baseType = res.contentType.split(";")[0].trim().toLowerCase();
  const ext = IMAGE_EXT[baseType];
  if (!ext || res.body.length === 0) return null;

  const hash = createHash("sha256").update(previewUrl).digest("hex").slice(0, 32);
  const path = `${hash}.${ext}`;

  const { error } = await admin.storage
    .from(LINK_PREVIEW_BUCKET)
    .upload(path, Buffer.from(res.body), {
      contentType: baseType,
      upsert: true,
    });
  if (error) return null;

  const imageUrl = admin.storage.from(LINK_PREVIEW_BUCKET).getPublicUrl(path).data
    .publicUrl;
  return { imageUrl, imagePath: path };
}
