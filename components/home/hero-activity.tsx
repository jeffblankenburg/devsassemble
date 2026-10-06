import Link from "next/link";
import Image from "next/image";
import { listTopics } from "@/lib/forum/queries";
import { listRecentMembers } from "@/lib/profile/queries";
import { timeAgo } from "@/lib/forum/format";

function initial(name: string | null, username: string) {
  return (name ?? username).charAt(0).toUpperCase();
}

/**
 * Compact "live now" panel for the hero's right column — latest discussions +
 * newest members, from live data. Pre-launch it invites the first post.
 */
export async function HeroActivity() {
  const [topics, members] = await Promise.all([
    listTopics({ limit: 3 }),
    listRecentMembers(6),
  ]);

  return (
    <div className="w-full max-w-md rounded-[var(--radius-comic)] border-ink bg-surface p-5 shadow-comic-lg">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-sm uppercase tracking-widest text-brand-ink">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-lime ring-2 ring-brand-ink" />
          Latest
        </span>
        <Link
          href="/discussions"
          className="focus-comic font-mono text-xs uppercase tracking-widest text-muted hover:text-brand-blue"
        >
          All →
        </Link>
      </div>

      {topics.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {topics.map((t) => (
            <li key={t.id}>
              <Link
                href={`/discussions/${t.slug}`}
                className="focus-comic block rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-2 transition-transform hover:-translate-y-0.5"
              >
                <span className="line-clamp-1 font-display text-base uppercase tracking-wide text-brand-ink">
                  {t.title}
                </span>
                <span className="font-mono text-xs text-muted">
                  {t.author?.username ? `@${t.author.username}` : "a member"} ·{" "}
                  {timeAgo(t.last_activity_at)} · {t.reply_count}{" "}
                  {t.reply_count === 1 ? "reply" : "replies"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-3">
          <p className="font-display text-base uppercase tracking-wide text-brand-ink">
            Be the first to post
          </p>
          <Link
            href="/discussions/new"
            className="focus-comic font-mono text-xs uppercase tracking-widest text-brand-blue underline underline-offset-2"
          >
            Start a discussion →
          </Link>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t-2 border-brand-ink/10 pt-3">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          New
        </span>
        {members.length > 0 ? (
          <ul className="flex -space-x-2">
            {members.map((m) => (
              <li key={m.username} className="transition-transform hover:-translate-y-0.5">
                <Link href={`/u/${m.username}`} aria-label={`@${m.username}`}>
                  {m.avatar_url ? (
                    <Image
                      src={m.avatar_url}
                      alt={m.display_name ?? m.username}
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full border-[2px] border-brand-ink object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-[2px] border-brand-ink bg-brand-lime font-display text-sm text-brand-ink">
                      {initial(m.display_name, m.username)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-brand-ink/60">
            Be the first to assemble.
          </span>
        )}
      </div>
    </div>
  );
}
