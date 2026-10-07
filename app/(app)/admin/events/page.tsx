import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import {
  listAllEventsForAdmin,
  filterAdminEvents,
  type AdminEventFilter,
} from "@/lib/events/queries";
import { formatFullDate, formatTime, tzLabel } from "@/lib/events/format";
import { ComicButton } from "@/components/brand/comic-button";

export const metadata: Metadata = { title: "Manage events" };

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-brand-cream text-brand-ink",
  published: "bg-brand-lime text-brand-ink",
  cancelled: "bg-brand-ink text-white",
};

const FILTERS: { key: AdminEventFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "cancelled", label: "Cancelled" },
  { key: "past", label: "Past" },
];

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireAdmin();
  const { filter: filterParam } = await searchParams;
  const activeFilter: AdminEventFilter = FILTERS.some(
    (f) => f.key === filterParam,
  )
    ? (filterParam as AdminEventFilter)
    : "all";

  const allEvents = await listAllEventsForAdmin();
  const { events, counts, pastIds } = filterAdminEvents(
    allEvents,
    activeFilter,
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
          Events
        </h1>
        <ComicButton href="/admin/events/new" variant="blue">
          New event
        </ComicButton>
      </div>

      <nav
        aria-label="Filter events"
        className="mt-6 flex flex-wrap gap-2"
      >
        {FILTERS.map((f) => {
          const isActive = f.key === activeFilter;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/admin/events" : `/admin/events?filter=${f.key}`}
              aria-current={isActive ? "page" : undefined}
              className={`focus-comic rounded-md border-[2px] border-brand-ink px-3 py-1 font-display text-sm uppercase tracking-wide shadow-comic-sm ${
                isActive
                  ? "bg-brand-blue text-white"
                  : "bg-surface text-brand-ink hover:bg-brand-lime"
              }`}
            >
              {f.label}{" "}
              <span className={isActive ? "text-white/70" : "text-brand-ink/50"}>
                {counts[f.key]}
              </span>
            </Link>
          );
        })}
      </nav>

      {events.length === 0 ? (
        <p className="mt-8 text-brand-ink/70">
          {activeFilter === "all"
            ? "No events yet. Create your first one to seed the community."
            : "No events match this filter."}
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between gap-4 rounded-[var(--radius-comic)] border-ink bg-surface p-4 shadow-comic"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md border-[2px] border-brand-ink px-2 py-0.5 font-display text-xs uppercase ${STATUS_STYLE[event.status]}`}
                  >
                    {event.status}
                  </span>
                  {event.is_live && (
                    <span className="rounded-md border-[2px] border-brand-ink bg-brand-purple px-2 py-0.5 font-display text-xs uppercase text-white">
                      ● Live
                    </span>
                  )}
                  {pastIds.has(event.id) && (
                    <span className="rounded-md border-[2px] border-brand-ink bg-brand-ink/10 px-2 py-0.5 font-display text-xs uppercase text-brand-ink/60">
                      Past
                    </span>
                  )}
                </div>
                <h2 className="mt-1 truncate font-display text-xl uppercase tracking-wide text-brand-ink">
                  {event.title}
                </h2>
                <p className="font-mono text-xs uppercase tracking-widest text-muted">
                  {formatFullDate(event.starts_at)} · {formatTime(event.starts_at)}{" "}
                  {tzLabel(event.timezone)}
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <Link
                  href={`/events/${event.slug}`}
                  className="focus-comic font-display text-sm uppercase tracking-wide text-brand-ink/70 hover:text-brand-blue"
                >
                  View
                </Link>
                <Link
                  href={`/admin/events/${event.id}/edit`}
                  className="focus-comic font-display text-sm uppercase tracking-wide text-brand-blue hover:underline"
                >
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
