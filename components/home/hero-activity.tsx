import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { listTopics } from "@/lib/forum/queries";
import { listRecentRepos } from "@/lib/repos/queries";
import { listRecentTools } from "@/lib/tools/queries";
import { listRecentMembers } from "@/lib/profile/queries";
import { timeAgo } from "@/lib/forum/format";

function initial(name: string | null, username: string) {
  return (name ?? username).charAt(0).toUpperCase();
}

type ActivityItem = {
  key: string;
  icon: string;
  title: ReactNode;
  href: string;
  meta: string;
  at: string;
};

const highlight = "text-brand-blue";

/**
 * Compact activity panel for the hero's right column — a unified "Latest" feed
 * of discussions + projects (recency-sorted) plus newest members, from live
 * data. Pre-launch the empty state invites the first post.
 */
export async function HeroActivity() {
  const [topics, repos, tools, members] = await Promise.all([
    listTopics({ limit: 4 }),
    listRecentRepos(4),
    listRecentTools(4),
    listRecentMembers(6),
  ]);

  const items: ActivityItem[] = [
    ...topics.map((t) => ({
      key: `t-${t.id}`,
      icon: "💬",
      title: t.title,
      href: `/discussions/${t.slug}`,
      meta: `${t.author?.username ? `@${t.author.username}` : "a member"} · ${
        t.reply_count
      } ${t.reply_count === 1 ? "reply" : "replies"}`,
      at: t.last_activity_at,
    })),
    ...repos.map((r) => {
      const who = r.submitter?.username
        ? `@${r.submitter.username}`
        : (r.submitter?.display_name ?? "a member");
      return {
        key: `r-${r.id}`,
        icon: "📦",
        title: (
          <>
            {who} shared <span className={highlight}>{r.name}</span>
          </>
        ),
        href: "/projects",
        meta: "",
        at: r.created_at,
      };
    }),
    ...tools.map((t) => {
      const who = t.submitter?.username
        ? `@${t.submitter.username}`
        : (t.submitter?.display_name ?? "a member");
      return {
        key: `tool-${t.id}`,
        icon: "🛠️",
        title: (
          <>
            {who} shared <span className={highlight}>{t.name}</span>
          </>
        ),
        href: "/tools",
        meta: "",
        at: t.created_at,
      };
    }),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 4);

  return (
    <div className="w-full max-w-md rounded-[var(--radius-comic)] border-ink bg-surface p-5 shadow-comic-lg">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-sm uppercase tracking-widest text-brand-ink">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-lime ring-2 ring-brand-ink" />
          Latest
        </span>
        <Link
          href="/projects"
          className="focus-comic font-mono text-xs uppercase tracking-widest text-muted hover:text-brand-blue"
        >
          Explore →
        </Link>
      </div>

      {items.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="focus-comic block rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-2 transition-transform hover:-translate-y-0.5"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="shrink-0 text-base">
                    {item.icon}
                  </span>
                  <span className="line-clamp-2 pr-1 font-display text-base uppercase tracking-wide text-brand-ink">
                    {item.title}
                  </span>
                </span>
                <span className="mt-0.5 line-clamp-2 block font-mono text-xs text-muted">
                  {item.meta ? `${item.meta} · ` : ""}
                  {timeAgo(item.at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-3">
          <p className="font-display text-base uppercase tracking-wide text-brand-ink">
            Nothing here yet — be first
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
              <li
                key={m.username}
                className="transition-transform hover:-translate-y-0.5"
              >
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
