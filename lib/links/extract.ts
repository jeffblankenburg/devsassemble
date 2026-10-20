// Pure helpers for finding and normalizing the URLs we unfurl. No server-only
// deps so this can be unit-tested and reused from a client composer preview.

/** Query params that only track clicks — dropped so the cache key dedupes. */
const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "igshid",
];

/** Most bare-URL posts link one thing; cap the work either way. */
export const MAX_UNFURLS_PER_POST = 5;

/**
 * Canonicalize a URL into the form used as the `link_previews` cache key:
 * http/https only, lower-cased host, no fragment, no tracking params. Returns
 * null for anything that isn't a plausible http(s) URL. This is a syntactic
 * normalizer only — it does NOT make the URL safe to fetch; safeFetch() owns
 * SSRF validation.
 */
export function normalizeUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname) return null;

  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  for (const param of TRACKING_PARAMS) url.searchParams.delete(param);
  // Drop a lone "?" left behind when the only params were tracking params.
  let out = url.toString();
  if (out.endsWith("?")) out = out.slice(0, -1);
  return out;
}

// A line that is nothing but a URL (optionally wrapped in a markdown autolink
// <...>). Lines with surrounding prose, or markdown [text](url) / ![alt](url)
// forms, deliberately don't match — only a standalone link unfurls, matching
// how Reddit/Slack/GitHub behave.
const BARE_URL_LINE = /^<?(https?:\/\/[^\s<>]+)>?$/i;

/** Trailing characters that are almost always punctuation, not part of a URL. */
function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?)\]}'"]+$/, "");
}

/**
 * Extract normalized URLs from lines of `body` that consist solely of a URL,
 * de-duplicated and capped at MAX_UNFURLS_PER_POST. Inline links and image
 * embeds are intentionally skipped.
 */
export function extractBareUrls(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = BARE_URL_LINE.exec(line);
    if (!match) continue;
    const normalized = normalizeUrl(trimTrailingPunctuation(match[1]));
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= MAX_UNFURLS_PER_POST) break;
  }
  return out;
}
