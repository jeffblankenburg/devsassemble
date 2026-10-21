import Link from "next/link";
import Image from "next/image";
import { AuthorChip } from "@/components/forum/author-chip";
import { LinkPreviews } from "@/components/links/link-preview-card";
import type { TopicListItem } from "@/lib/forum/queries";
import type { LinkPreview } from "@/lib/links/constants";
import { timeAgo, plainExcerpt, firstImageUrl } from "@/lib/forum/format";

/**
 * One topic as a social-timeline card: author up top, then the title + excerpt
 * as a single big click target into the thread, an inline link preview, and a
 * reply-count action bar. The preview card links OUT to its source; everything
 * else leads into the discussion.
 */
export function TopicCard({
  topic,
  previews,
}: {
  topic: TopicListItem;
  previews: Map<string, LinkPreview>;
}) {
  const excerpt = plainExcerpt(topic.body);
  const imageUrl = firstImageUrl(topic.body);
  const href = `/discussions/${topic.slug}`;

  return (
    <article className="rounded-[var(--radius-comic)] border-ink bg-surface p-5 shadow-comic transition hover:shadow-comic-lg">
      <div className="flex flex-wrap items-center gap-2 text-sm text-brand-ink/60">
        <AuthorChip author={topic.author} />
        <span>· {timeAgo(topic.last_activity_at)}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
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
            <Link
              href={`/discussions?category=${topic.category.slug}`}
              className="focus-comic font-mono text-xs uppercase tracking-widest text-muted hover:text-brand-blue"
            >
              {topic.category.name}
            </Link>
          )}
        </div>
      </div>

      <Link href={href} className="focus-comic group mt-3 block">
        <h2 className="font-display text-xl uppercase leading-tight tracking-wide text-brand-ink group-hover:text-brand-blue">
          {topic.title}
        </h2>
        {excerpt && (
          <p className="mt-1 line-clamp-3 text-brand-ink/70">{excerpt}</p>
        )}
      </Link>

      {imageUrl && (
        <Link
          href={href}
          className="focus-comic mt-3 block overflow-hidden rounded-[var(--radius-comic)] border-ink shadow-comic-sm"
        >
          <span className="relative block aspect-[16/9] bg-brand-ink/5">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </span>
        </Link>
      )}

      <LinkPreviews
        body={topic.body}
        previews={previews}
        limit={1}
        sourceTopicId={topic.id}
      />

      <div className="mt-4 flex items-center gap-2 border-t-[2px] border-brand-ink/10 pt-3">
        <Link
          href={href}
          className="focus-comic inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted hover:text-brand-purple"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
            <path d="M4 4h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1z" />
          </svg>
          {topic.reply_count} {topic.reply_count === 1 ? "reply" : "replies"}
        </Link>
      </div>
    </article>
  );
}
