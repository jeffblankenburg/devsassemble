import Image from "next/image";
import { SocialIcon } from "@/components/site/social-links";
import type { LinkPreview } from "@/lib/links/constants";
import type { SocialLink } from "@/lib/social/links";
import type { PublicPost } from "@/lib/tweets/queries";
import { timeAgo } from "@/lib/forum/format";

const HANDLE = "@devsassembleAI";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Drop raw URLs from the post text — the preview card (or source chip) below
 * carries the link, so the bare URL is just noise that also overflows the card.
 */
function bodyWithoutUrls(body: string): string {
  return body
    .replace(/<?https?:\/\/\S+>?/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** One published post, rendered natively from our own data. */
export function FeedCard({
  post,
  preview,
  newsTitle,
  newsSource,
}: {
  post: PublicPost;
  preview?: LinkPreview;
  /** Reliable title/source from our captured-news table (beats scraping). */
  newsTitle?: string | null;
  newsSource?: string | null;
}) {
  const bodyText = bodyWithoutUrls(post.body);
  const sourceUrl = post.source_url;
  // Best available specifics: our own captured title first, then OG, then host.
  const title = newsTitle ?? preview?.title ?? null;
  const label =
    newsSource ?? preview?.site_name ?? (sourceUrl ? hostOf(sourceUrl) : "");
  return (
    <article className="rounded-[var(--radius-comic)] border-ink bg-surface p-5 shadow-comic">
      <div className="flex items-center gap-2">
        <Image
          src="/logo-icon.png"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 rounded-full border-[2px] border-brand-ink"
        />
        <span className="font-display text-sm uppercase tracking-wide text-brand-ink">
          {HANDLE}
        </span>
        {post.posted_at && (
          <span className="font-mono text-xs uppercase tracking-widest text-muted">
            · {timeAgo(post.posted_at)}
          </span>
        )}
      </div>

      {bodyText && (
        <p className="mt-3 whitespace-pre-wrap text-brand-ink">{bodyText}</p>
      )}

      {sourceUrl && (
        <SourceCard
          href={preview ? `/l/${preview.id}` : sourceUrl}
          title={title}
          label={label}
          imageUrl={preview?.image_url ?? null}
          isVideo={preview?.kind === "video"}
        />
      )}

      {(post.posted_url || post.bluesky_url) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t-[2px] border-brand-ink/10 pt-3">
          {post.posted_url && (
            <PlatformLink href={post.posted_url} platform="x" label="View on X" />
          )}
          {post.bluesky_url && (
            <PlatformLink
              href={post.bluesky_url}
              platform="bluesky"
              label="View on Bluesky"
            />
          )}
        </div>
      )}
    </article>
  );
}

/** The source link a post is about, with the best title/image we have. */
function SourceCard({
  href,
  title,
  label,
  imageUrl,
  isVideo,
}: {
  href: string;
  title: string | null;
  label: string;
  imageUrl: string | null;
  isVideo: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="focus-comic group mt-4 block overflow-hidden rounded-[var(--radius-comic)] border-ink bg-surface shadow-comic transition hover:shadow-comic-lg"
    >
      {imageUrl && (
        <div className="relative aspect-[1.91/1] overflow-hidden border-b-[3px] border-brand-ink bg-brand-ink/5">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover transition group-hover:scale-[1.02]"
          />
          {isVideo && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-brand-ink bg-brand-lime shadow-comic-sm">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-brand-ink">
                  <path d="M8 5v14l12-7z" />
                </svg>
              </span>
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="font-mono text-xs uppercase tracking-widest text-muted">
          {label}
        </div>
        {title && (
          <div className="mt-1 line-clamp-2 font-display text-lg leading-tight text-brand-ink group-hover:text-brand-blue">
            {title}
          </div>
        )}
      </div>
    </a>
  );
}

function PlatformLink({
  href,
  platform,
  label,
}: {
  href: string;
  platform: SocialLink["key"];
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-comic inline-flex items-center gap-1.5 rounded-md border-[2px] border-brand-ink bg-surface px-3 py-1 font-display text-xs uppercase tracking-wide text-brand-ink shadow-comic-sm hover:bg-brand-lime"
    >
      <SocialIcon linkKey={platform} className="h-3.5 w-3.5" />
      {label} ↗
    </a>
  );
}
