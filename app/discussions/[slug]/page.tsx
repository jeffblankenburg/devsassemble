import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Markdown } from "@/components/markdown/markdown";
import { AuthorChip } from "@/components/forum/author-chip";
import { ReplyForm } from "@/components/forum/reply-form";
import { ReportButton } from "@/components/forum/report-button";
import { ComicButton } from "@/components/brand/comic-button";
import { getSessionUser } from "@/lib/auth/dal";
import { getTopicBySlug, listPosts } from "@/lib/forum/queries";
import {
  deleteTopic,
  deletePost,
  setTopicLock,
  setTopicPin,
} from "@/lib/forum/actions";
import { timeAgo } from "@/lib/forum/format";

type TopicPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) return { title: "Discussion not found" };
  return {
    title: topic.title,
    description: topic.body.slice(0, 150),
  };
}

const modButtonClass =
  "focus-comic rounded-md border-ink bg-surface px-3 py-1 font-display text-xs uppercase tracking-wide text-brand-ink shadow-comic-sm hover:bg-brand-lime";

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();

  const [posts, user] = await Promise.all([
    listPosts(topic.id),
    getSessionUser(),
  ]);

  const isAdmin = user?.role === "admin" || user?.role === "moderator";
  const canEditTopic = Boolean(user && (user.id === topic.author_id || isAdmin));

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link
          href="/discussions"
          className="focus-comic font-mono text-xs uppercase tracking-widest text-muted hover:text-brand-blue"
        >
          ← All discussions
        </Link>

        <article className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            {topic.is_pinned && (
              <span className="rounded-md border-[2px] border-brand-ink bg-brand-lime px-2 py-0.5 font-display text-xs uppercase text-brand-ink">
                Pinned
              </span>
            )}
            {topic.is_locked && (
              <span className="rounded-md border-[2px] border-brand-ink bg-brand-ink px-2 py-0.5 font-display text-xs uppercase text-white">
                Locked
              </span>
            )}
            {topic.category && (
              <span className="font-mono text-xs uppercase tracking-widest text-muted">
                {topic.category.name}
              </span>
            )}
          </div>

          <h1 className="mt-2 font-display text-4xl uppercase leading-[0.95] tracking-tight text-brand-ink sm:text-5xl">
            {topic.title}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-brand-ink/60">
            <AuthorChip author={topic.author} />
            <span>· {timeAgo(topic.created_at)}</span>
          </div>

          <div className="mt-6 rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
            <Markdown>{topic.body}</Markdown>
          </div>

          {/* Topic controls */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {isAdmin && (
              <>
                <form action={setTopicPin}>
                  <input type="hidden" name="id" value={topic.id} />
                  <input type="hidden" name="slug" value={topic.slug} />
                  <input
                    type="hidden"
                    name="pinned"
                    value={(!topic.is_pinned).toString()}
                  />
                  <button type="submit" className={modButtonClass}>
                    {topic.is_pinned ? "Unpin" : "Pin"}
                  </button>
                </form>
                <form action={setTopicLock}>
                  <input type="hidden" name="id" value={topic.id} />
                  <input type="hidden" name="slug" value={topic.slug} />
                  <input
                    type="hidden"
                    name="locked"
                    value={(!topic.is_locked).toString()}
                  />
                  <button type="submit" className={modButtonClass}>
                    {topic.is_locked ? "Unlock" : "Lock"}
                  </button>
                </form>
              </>
            )}
            {canEditTopic && (
              <form action={deleteTopic}>
                <input type="hidden" name="id" value={topic.id} />
                <button
                  type="submit"
                  className="focus-comic rounded-md border-ink bg-brand-purple px-3 py-1 font-display text-xs uppercase tracking-wide text-white shadow-comic-sm"
                >
                  Delete topic
                </button>
              </form>
            )}
            {user && <ReportButton targetType="topic" targetId={topic.id} />}
          </div>
        </article>

        {/* Replies */}
        <section className="mt-10">
          <h2 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
            {topic.reply_count} {topic.reply_count === 1 ? "reply" : "replies"}
          </h2>

          <ul className="mt-4 flex flex-col gap-4">
            {posts.map((post) => {
              const canDelete = Boolean(
                user && (user.id === post.author_id || isAdmin),
              );
              return (
                <li
                  key={post.id}
                  className="rounded-[var(--radius-comic)] border-ink bg-surface p-5 shadow-comic"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm text-brand-ink/60">
                      <AuthorChip author={post.author} />
                      <span>· {timeAgo(post.created_at)}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Markdown>{post.body}</Markdown>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    {canDelete && (
                      <form action={deletePost}>
                        <input type="hidden" name="id" value={post.id} />
                        <input type="hidden" name="slug" value={topic.slug} />
                        <button
                          type="submit"
                          className="focus-comic font-mono text-xs uppercase tracking-widest text-muted hover:text-brand-purple"
                        >
                          Delete
                        </button>
                      </form>
                    )}
                    {user && (
                      <ReportButton targetType="post" targetId={post.id} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Reply box */}
          <div className="mt-8">
            {topic.is_locked ? (
              <p className="rounded-[var(--radius-comic)] border-ink bg-surface p-4 font-display uppercase tracking-wide text-brand-ink/60 shadow-comic">
                This topic is locked.
              </p>
            ) : user ? (
              <ReplyForm topicId={topic.id} slug={topic.slug} />
            ) : (
              <div className="flex flex-col gap-2">
                <ComicButton
                  href={`/login?next=${encodeURIComponent(`/discussions/${topic.slug}`)}`}
                  variant="blue"
                >
                  Sign in to reply
                </ComicButton>
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                  Free · Sign in with GitHub to join the conversation
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
