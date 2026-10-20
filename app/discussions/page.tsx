import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { TopicCard } from "@/components/forum/topic-card";
import { ComicButton } from "@/components/brand/comic-button";
import { listCategories, listTopics } from "@/lib/forum/queries";
import { getLinkPreviewsForBodies } from "@/lib/links/queries";
import { getSessionUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Discussions",
  description:
    "Community discussions on tools, builds, and strategies. Browse freely; sign in to post.",
};

type DiscussionsPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function DiscussionsPage({
  searchParams,
}: DiscussionsPageProps) {
  const { category } = await searchParams;
  const [categories, topics, user] = await Promise.all([
    listCategories(),
    listTopics({ categorySlug: category, limit: 50 }),
    getSessionUser(),
  ]);

  const previews = await getLinkPreviewsForBodies(topics.map((t) => t.body));

  const newTopicHref = user
    ? "/discussions/new"
    : "/login?next=/discussions/new";

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
            Discussions
          </h1>
          <ComicButton href={newTopicHref} variant="blue">
            New topic
          </ComicButton>
        </div>

        {/* Category filter */}
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Categories">
          <Link
            href="/discussions"
            className={`focus-comic rounded-md border-ink px-3 py-1 font-display text-sm uppercase tracking-wide shadow-comic-sm ${
              !category ? "bg-brand-ink text-white" : "bg-surface text-brand-ink"
            }`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/discussions?category=${c.slug}`}
              className={`focus-comic rounded-md border-ink px-3 py-1 font-display text-sm uppercase tracking-wide shadow-comic-sm ${
                category === c.slug
                  ? "bg-brand-ink text-white"
                  : "bg-surface text-brand-ink"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </nav>

        {/* Topics */}
        {topics.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-10 text-center shadow-comic">
            <p className="font-display text-2xl uppercase tracking-wide text-brand-ink">
              No topics yet
            </p>
            <p className="mt-2 text-brand-ink/70">
              Start the first discussion — sign in and post.
            </p>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {topics.map((t) => (
              <li key={t.id}>
                <TopicCard topic={t} previews={previews} />
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
