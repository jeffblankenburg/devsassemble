import Link from "next/link";
import { ComicButton } from "@/components/brand/comic-button";
import { listPublicFeed } from "@/lib/tweets/queries";
import { timeAgo } from "@/lib/forum/format";

/**
 * Homepage teaser for the social feed — the most recent published posts, with a
 * link to the full /feed. Renders nothing until there's something posted.
 */
export async function LatestPosts() {
  const posts = await listPublicFeed(3);
  if (posts.length === 0) return null;

  return (
    <section className="px-6 py-12 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-end justify-between gap-6 sm:flex-row">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-brand-blue">
              From the feed
            </span>
            <h2 className="mt-4 font-display text-4xl uppercase tracking-wide text-brand-ink sm:text-5xl">
              Latest from @devsassembleAI
            </h2>
            <p className="mt-3 max-w-xl text-brand-ink/75">
              AI dev news, tools, and community highlights — everything we post,
              on the site too.
            </p>
          </div>
          <ComicButton href="/feed" variant="lime">
            See the full feed
          </ComicButton>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href="/feed"
                className="focus-comic flex h-full flex-col rounded-[var(--radius-comic)] border-ink bg-surface p-5 shadow-comic transition-transform hover:-translate-y-0.5 hover:shadow-comic-lg"
              >
                <p className="line-clamp-5 text-brand-ink">{post.body}</p>
                {post.posted_at && (
                  <span className="mt-3 font-mono text-xs uppercase tracking-widest text-muted">
                    {timeAgo(post.posted_at)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
