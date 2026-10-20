import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/auth/dal";
import {
  getClickTotals,
  getTopClickedLinks,
  getRecentClicks,
} from "@/lib/links/analytics";
import type { LinkPreviewKind } from "@/lib/links/constants";
import { timeAgo } from "@/lib/forum/format";

export const metadata: Metadata = { title: "Link analytics" };

const KIND_BADGE: Record<LinkPreviewKind, string> = {
  article: "📄",
  video: "📺",
  link: "🔗",
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function LinkAnalyticsPage() {
  await requireCapability("view_insights");

  const [totals, top, recent] = await Promise.all([
    getClickTotals(),
    getTopClickedLinks(20),
    getRecentClicks(25),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
        Link analytics
      </h1>
      <p className="mt-2 text-brand-ink/70">
        Clickthroughs on shared articles, videos, and links from discussions.
      </p>

      {/* Totals */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Stat label="Clicks all-time" value={totals.total} accent="bg-brand-lime text-brand-ink" />
        <Stat label="Clicks last 7 days" value={totals.last7d} accent="bg-brand-blue text-white" />
      </div>

      {/* Top content */}
      <h2 className="mt-12 font-display text-2xl uppercase tracking-wide text-brand-ink">
        Top content
      </h2>
      {top.length === 0 ? (
        <Empty>No clicks recorded yet.</Empty>
      ) : (
        <ol className="mt-4 flex flex-col gap-2">
          {top.map((link, i) => (
            <li
              key={link.id}
              className="flex items-center gap-3 rounded-[var(--radius-comic)] border-ink bg-surface p-4 shadow-comic"
            >
              <span className="font-display text-lg text-brand-ink/40">
                {i + 1}
              </span>
              <span className="text-xl" aria-hidden>
                {KIND_BADGE[link.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="focus-comic block truncate font-display text-base text-brand-ink hover:text-brand-blue"
                >
                  {link.title ?? link.url}
                </a>
                <span className="font-mono text-xs uppercase tracking-widest text-muted">
                  {link.site_name ?? hostOf(link.url)}
                </span>
              </div>
              <span className="shrink-0 font-display text-2xl text-brand-ink">
                {link.click_count}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Recent activity */}
      <h2 className="mt-12 font-display text-2xl uppercase tracking-wide text-brand-ink">
        Recent clicks
      </h2>
      {recent.length === 0 ? (
        <Empty>Nothing clicked recently.</Empty>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {recent.map((click, i) => {
            const who =
              click.user?.display_name ?? click.user?.username ?? "Anonymous";
            return (
              <li
                key={`${click.created_at}-${i}`}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-comic)] border-ink bg-surface px-4 py-3 shadow-comic-sm"
              >
                <span aria-hidden>{KIND_BADGE[click.kind]}</span>
                <a
                  href={click.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="focus-comic min-w-0 truncate font-display text-sm text-brand-ink hover:text-brand-blue"
                >
                  {click.title ?? hostOf(click.url)}
                </a>
                <span className="font-mono text-xs uppercase tracking-widest text-muted">
                  · {who}
                </span>
                {click.topic && (
                  <Link
                    href={`/discussions/${click.topic.slug}`}
                    className="focus-comic font-mono text-xs uppercase tracking-widest text-muted hover:text-brand-purple"
                  >
                    · from “{click.topic.title}”
                  </Link>
                )}
                <span className="ml-auto font-mono text-xs uppercase tracking-widest text-muted">
                  {timeAgo(click.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className={`rounded-[var(--radius-comic)] border-ink p-6 shadow-comic ${accent}`}>
      <div className="font-display text-5xl tracking-tight">{value}</div>
      <div className="mt-1 font-mono text-xs uppercase tracking-widest opacity-90">
        {label}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-[var(--radius-comic)] border-ink bg-surface p-6 text-center text-brand-ink/60 shadow-comic">
      {children}
    </p>
  );
}
