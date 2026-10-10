"use client";

import { useState } from "react";

export type NewsItemRow = {
  id: string;
  source: string;
  title: string;
  url: string;
  created_at: string;
};

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="shrink-0 rounded-md border-[2px] border-brand-ink bg-brand-cream px-2 py-0.5 font-display text-xs uppercase tracking-wide text-brand-ink">
      {source}
    </span>
  );
}

/** Read-only view of the raw captured news feed, filterable by source. */
export function NewsFeed({ items }: { items: NewsItemRow[] }) {
  const [active, setActive] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="mt-6 text-sm text-brand-ink/55">
        Nothing captured yet. Items land here as IFTTT pushes them in.
      </p>
    );
  }

  const counts = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.source] = (acc[i.source] ?? 0) + 1;
    return acc;
  }, {});
  const sources = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const shown = active ? items.filter((i) => i.source === active) : items;
  // Items arrive newest-first, so the first row is the most recent capture.
  const lastReceived = items[0].created_at;

  const chip = (key: string | null, label: string, count: number) => (
    <button
      key={key ?? "all"}
      type="button"
      onClick={() => setActive(key)}
      aria-pressed={active === key}
      className={`focus-comic rounded-md border-[2px] border-brand-ink px-3 py-1 font-display text-xs uppercase tracking-wide shadow-comic-sm transition-transform hover:-translate-y-0.5 ${
        active === key ? "bg-brand-blue text-white" : "bg-white text-brand-ink"
      }`}
    >
      {label} ({count})
    </button>
  );

  return (
    <>
      <p className="mt-4 text-sm text-brand-ink/60">
        Last received:{" "}
        <span suppressHydrationWarning className="font-mono text-brand-ink/80">
          {new Date(lastReceived).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {chip(null, "All", items.length)}
        {sources.map((s) => chip(s, s, counts[s]))}
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {shown.map((i) => (
          <li
            key={i.id}
            className="flex items-center gap-3 rounded-[var(--radius-comic)] border-ink bg-surface px-3 py-2 shadow-comic-sm"
          >
            <SourceBadge source={i.source} />
            <a
              href={i.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-comic min-w-0 flex-1 truncate text-sm text-brand-ink/85 hover:text-brand-blue hover:underline"
            >
              {i.title}
            </a>
            <span
              suppressHydrationWarning
              className="shrink-0 font-mono text-xs text-brand-ink/50"
            >
              {new Date(i.created_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
