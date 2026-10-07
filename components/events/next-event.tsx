import Link from "next/link";
import type { EventRow } from "@/lib/events/queries";
import { formatDateParts, tzLabel } from "@/lib/events/format";

const ACCENT: Record<EventRow["accent"], string> = {
  blue: "bg-brand-blue text-white",
  lime: "bg-brand-lime text-brand-ink",
  purple: "bg-brand-purple text-white",
};

/** Compact "next up" teaser for the next upcoming event (hero). */
export function NextEvent({ event }: { event: EventRow }) {
  const d = formatDateParts(event.starts_at, event.timezone);

  return (
    <Link
      href={`/events/${event.slug}`}
      className="focus-comic group flex w-full max-w-md items-center gap-3 rounded-[var(--radius-comic)] border-ink bg-surface p-3 text-left shadow-comic transition-transform hover:-translate-y-0.5 hover:shadow-comic-lg"
    >
      <div
        className={`flex w-16 shrink-0 flex-col items-center justify-center rounded-md border-ink ${ACCENT[event.accent]} py-1.5 font-display leading-none`}
      >
        <span className="text-sm uppercase tracking-wide">{d.month}</span>
        <span className="text-3xl">{d.day}</span>
      </div>
      <div className="min-w-0">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {event.is_live ? "● Live now" : "Next up"} · {d.time}{" "}
          {tzLabel(event.timezone)}
        </span>
        <p className="line-clamp-1 font-display text-base uppercase leading-tight tracking-wide text-brand-ink group-hover:text-brand-blue">
          {event.title}
        </p>
      </div>
    </Link>
  );
}
