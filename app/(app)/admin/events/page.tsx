import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { listAllEventsForAdmin } from "@/lib/events/queries";
import { formatFullDate, formatTime, tzLabel } from "@/lib/events/format";
import { ComicButton } from "@/components/brand/comic-button";

export const metadata: Metadata = { title: "Manage events" };

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-brand-cream text-brand-ink",
  published: "bg-brand-lime text-brand-ink",
  cancelled: "bg-brand-ink text-white",
};

export default async function AdminEventsPage() {
  await requireAdmin();
  const events = await listAllEventsForAdmin();

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

      {events.length === 0 ? (
        <p className="mt-8 text-brand-ink/70">
          No events yet. Create your first one to seed the community.
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
