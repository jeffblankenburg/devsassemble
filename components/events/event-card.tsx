import Link from "next/link";
import type { EventRow } from "@/lib/events/queries";
import { formatDateParts, tzLabel } from "@/lib/events/format";

const ACCENT: Record<EventRow["accent"], string> = {
  blue: "bg-brand-blue text-white",
  lime: "bg-brand-lime text-brand-ink",
  purple: "bg-brand-purple text-white",
};

/** A linked event row with the comic date plate. */
export function EventCard({
  event,
  goingCount,
}: {
  event: EventRow;
  goingCount?: number;
}) {
  const d = formatDateParts(event.starts_at, event.timezone);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="focus-comic group flex items-stretch gap-4 rounded-[var(--radius-comic)] border-ink bg-surface p-4 shadow-comic transition-transform duration-100 hover:-translate-y-0.5 hover:shadow-comic-lg"
    >
      <div
        className={`flex w-20 shrink-0 flex-col items-center justify-center rounded-md border-ink ${ACCENT[event.accent]} py-2 font-display leading-none`}
      >
        <span className="text-sm uppercase tracking-widest">{d.month}</span>
        <span className="text-4xl">{d.day}</span>
        <span className="text-xs uppercase opacity-90">{d.weekday}</span>
      </div>

      <div className="flex min-w-0 flex-col justify-center">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          {d.time} {tzLabel(event.timezone)}
          {event.host ? ` · ${event.host}` : ""}
        </span>
        <h3
          className={`mt-1 font-display text-xl uppercase leading-tight tracking-wide text-brand-ink ${
            event.status === "cancelled" ? "text-brand-ink/50 line-through" : ""
          }`}
        >
          {event.title}
        </h3>
        {event.summary && (
          <p className="mt-1 line-clamp-2 text-sm text-brand-ink/70">
            {event.summary}
          </p>
        )}
        {typeof goingCount === "number" && goingCount > 0 && (
          <span className="mt-1 font-mono text-xs uppercase tracking-widest text-muted">
            {goingCount} going
          </span>
        )}
      </div>

      {event.is_live && (
        <span className="ml-auto self-start rounded-md border-ink bg-brand-purple px-2 py-0.5 font-display text-xs uppercase text-white">
          ● Live
        </span>
      )}
      {event.status === "cancelled" && (
        <span className="ml-auto self-start rounded-md border-ink bg-brand-ink px-2 py-0.5 font-display text-xs uppercase text-white">
          Cancelled
        </span>
      )}
    </Link>
  );
}
