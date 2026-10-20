import Image from "next/image";
import { extractBareUrls } from "@/lib/links/extract";
import type { LinkPreview } from "@/lib/links/constants";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** A single unfurled link rendered as a comic-styled card linking out. */
export function LinkPreviewCard({
  preview,
  sourceTopicId,
  track = true,
}: {
  preview: LinkPreview;
  /** The discussion this card appears in, for click attribution. */
  sourceTopicId?: string;
  /** When false, link straight to the source (no click tracking). */
  track?: boolean;
}) {
  const source = preview.site_name ?? hostOf(preview.url);
  // Tracked clicks route through /l/[id], which logs then 302s to the source.
  const href = track
    ? `/l/${preview.id}${sourceTopicId ? `?from=${sourceTopicId}` : ""}`
    : preview.url;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="focus-comic group block overflow-hidden rounded-[var(--radius-comic)] border-ink bg-surface shadow-comic transition hover:shadow-comic-lg"
    >
      {preview.image_url && (
        <div className="relative aspect-[1.91/1] overflow-hidden border-b-[3px] border-brand-ink bg-brand-ink/5">
          <Image
            src={preview.image_url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover transition group-hover:scale-[1.02]"
          />
          {preview.kind === "video" && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-brand-ink bg-brand-lime shadow-comic-sm">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-6 w-6 fill-brand-ink"
                >
                  {/* Centroid at (12,12) so it optically centers in the circle. */}
                  <path d="M8 5v14l12-7z" />
                </svg>
              </span>
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="font-mono text-xs uppercase tracking-widest text-muted">
          {source}
        </div>
        <div className="mt-1 line-clamp-2 font-display text-lg leading-tight text-brand-ink group-hover:text-brand-blue">
          {preview.title ?? preview.url}
        </div>
        {preview.description && (
          <p className="mt-1 line-clamp-2 text-sm text-brand-ink/70">
            {preview.description}
          </p>
        )}
        {preview.author && (
          <div className="mt-2 font-mono text-xs uppercase tracking-widest text-muted">
            {preview.author}
          </div>
        )}
      </div>
    </a>
  );
}

/**
 * Render preview cards for the bare URLs in `body` that have a resolved entry in
 * `previews`. URLs still pending/errored just stay as the plain markdown link
 * rendered elsewhere, so nothing shows here for them.
 */
export function LinkPreviews({
  body,
  previews,
  limit,
  sourceTopicId,
  track = true,
}: {
  body: string;
  previews: Map<string, LinkPreview>;
  /** Cap how many cards render (e.g. 1 in a timeline list). */
  limit?: number;
  /** The discussion these cards appear in, for click attribution. */
  sourceTopicId?: string;
  /** When false, cards link straight to the source (no click tracking). */
  track?: boolean;
}) {
  let cards = extractBareUrls(body)
    .map((url) => previews.get(url))
    .filter((p): p is LinkPreview => Boolean(p));
  if (limit !== undefined) cards = cards.slice(0, limit);
  if (cards.length === 0) return null;
  return (
    <div className="mt-4 flex flex-col gap-3">
      {cards.map((preview) => (
        <LinkPreviewCard
          key={preview.url}
          preview={preview}
          sourceTopicId={sourceTopicId}
          track={track}
        />
      ))}
    </div>
  );
}
