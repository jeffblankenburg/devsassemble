import Link from "next/link";

export type EventFormat = "all" | "virtual" | "in-person";

const OPTIONS: { value: EventFormat; label: string }[] = [
  { value: "all", label: "All" },
  { value: "virtual", label: "Virtual" },
  { value: "in-person", label: "In person" },
];

/** Format filter chips. Server-rendered Links so the filter is SSR + shareable. */
export function EventFilters({ active }: { active: EventFormat }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter events">
      {OPTIONS.map((o) => {
        const on = o.value === active;
        const href = o.value === "all" ? "/events" : `/events?format=${o.value}`;
        return (
          <Link
            key={o.value}
            href={href}
            aria-pressed={on}
            className={`focus-comic rounded-md border-ink px-4 py-1.5 font-display text-sm uppercase tracking-wide shadow-comic-sm transition-transform hover:-translate-y-0.5 ${
              on ? "bg-brand-ink text-white" : "bg-surface text-brand-ink"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
