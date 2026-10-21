import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { FeedCard } from "@/components/feed/feed-card";
import { listPublicFeed, countPublicFeed } from "@/lib/tweets/queries";
import { getLinkPreviewsForUrls } from "@/lib/links/queries";
import { getNewsForUrls } from "@/lib/news/queries";
import { normalizeUrl } from "@/lib/links/extract";
import { unfurlPost } from "@/lib/links/unfurl";
import { SOCIAL_LINKS } from "@/lib/social/links";
import { SocialIcon } from "@/components/site/social-links";

export const metadata: Metadata = {
  title: "Feed",
  description:
    "Everything @devsassembleAI is posting — AI dev news, tools, and community highlights, all in one place.",
};

const PER_PAGE = 20;

const pagerClass =
  "focus-comic rounded-md border-ink bg-surface px-4 py-2 font-display text-xs uppercase tracking-wide text-brand-ink shadow-comic-sm hover:bg-brand-lime";
const pagerDisabled =
  "rounded-md border-[2px] border-brand-ink/20 px-4 py-2 font-display text-xs uppercase tracking-wide text-brand-ink/30";

type FeedPageProps = { searchParams: Promise<{ page?: string }> };

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PER_PAGE;

  const [posts, total] = await Promise.all([
    listPublicFeed(PER_PAGE, offset),
    countPublicFeed(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Map each post to its normalized source URL, and collect them for preview
  // lookup. The link_previews cache is keyed by the normalized URL.
  const sourceByPost = new Map<string, string>();
  const sourceUrls: string[] = [];
  for (const post of posts) {
    const normalized = post.source_url ? normalizeUrl(post.source_url) : null;
    if (normalized) {
      sourceByPost.set(post.id, normalized);
      sourceUrls.push(normalized);
    }
  }

  // Reliable titles come from our own captured-news table, keyed by the raw
  // source URL (Reddit etc. block server-side scraping, so OG can't get them).
  const rawSourceUrls = posts
    .map((p) => p.source_url)
    .filter((u): u is string => Boolean(u));

  const [previews, news] = await Promise.all([
    getLinkPreviewsForUrls(sourceUrls),
    getNewsForUrls(rawSourceUrls),
  ]);

  // Warm any source previews we don't have yet, in the background. The unfurl
  // extractor caps per call, so this self-limits instead of stampeding on the
  // first load — previews fill in over subsequent views.
  const uncached = [...new Set(sourceUrls)].filter((u) => !previews.has(u));
  if (uncached.length > 0) after(() => unfurlPost(uncached.join("\n")));

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
          Feed
        </h1>
        <p className="mt-2 text-brand-ink/70">
          Everything we&apos;re posting — AI dev news, tools, and community
          highlights.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-muted">
            Follow
          </span>
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s.key}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Follow DevsAssemble on ${s.label}`}
              title={s.label}
              className="focus-comic inline-flex items-center justify-center rounded-md border-ink bg-surface p-2 text-brand-ink shadow-comic-sm hover:bg-brand-lime"
            >
              <SocialIcon linkKey={s.key} className="h-4 w-4" />
            </a>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-10 text-center shadow-comic">
            <p className="font-display text-2xl uppercase tracking-wide text-brand-ink">
              Nothing posted yet
            </p>
            <p className="mt-2 text-brand-ink/70">
              Our latest posts will show up here.
            </p>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {posts.map((post) => (
              <li key={post.id}>
                <FeedCard
                  post={post}
                  preview={
                    sourceByPost.has(post.id)
                      ? previews.get(sourceByPost.get(post.id)!)
                      : undefined
                  }
                  newsTitle={
                    post.source_url ? news.get(post.source_url)?.title : undefined
                  }
                  newsSource={
                    post.source_url ? news.get(post.source_url)?.source : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav
            className="mt-8 flex items-center justify-between gap-4"
            aria-label="Feed pagination"
          >
            {page > 1 ? (
              <Link href={`/feed?page=${page - 1}`} className={pagerClass}>
                ← Newer
              </Link>
            ) : (
              <span className={pagerDisabled}>← Newer</span>
            )}
            <span className="font-mono text-xs uppercase tracking-widest text-muted">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={`/feed?page=${page + 1}`} className={pagerClass}>
                Older →
              </Link>
            ) : (
              <span className={pagerDisabled}>Older →</span>
            )}
          </nav>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
