import type { EventRow } from "@/lib/events/queries";
import { listOccurrenceSlots } from "@/lib/events/recurrence";
import { formatFullDate, formatTime, tzLabel } from "@/lib/events/format";
import { skipOccurrence, restoreOccurrence } from "@/lib/events/actions";

/**
 * Admin control for cancelling a single occurrence of a recurring event. Lists
 * the upcoming dates; each can be skipped (shown "Cancelled" on the site and
 * dropped from calendars via EXDATE) or restored.
 */
export function OccurrenceManager({ event }: { event: EventRow }) {
  if (event.recurrence === "none") return null;

  const slots = listOccurrenceSlots(event, new Date(), 10);

  return (
    <section className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
      <h2 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
        Upcoming occurrences
      </h2>
      <p className="mt-1 text-sm text-brand-ink/70">
        Cancel a single date (e.g. a holiday). It shows as cancelled on the site
        and drops from subscribed calendars.
      </p>

      {slots.length === 0 ? (
        <p className="mt-4 font-mono text-sm text-muted">
          No upcoming occurrences.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {slots.map((slot) => (
            <li
              key={slot.date}
              className="flex items-center justify-between gap-3 rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-2"
            >
              <span
                className={`font-mono text-sm text-brand-ink ${
                  slot.cancelled ? "text-brand-ink/50 line-through" : ""
                }`}
              >
                {formatFullDate(slot.iso, event.timezone)} ·{" "}
                {formatTime(slot.iso, event.timezone)} {tzLabel(event.timezone)}
              </span>
              <form action={slot.cancelled ? restoreOccurrence : skipOccurrence}>
                <input type="hidden" name="id" value={event.id} />
                <input type="hidden" name="date" value={slot.date} />
                <button
                  type="submit"
                  className={`focus-comic shrink-0 rounded-md border-[2px] border-brand-ink px-3 py-1 font-display text-xs uppercase shadow-comic-sm ${
                    slot.cancelled
                      ? "bg-brand-lime text-brand-ink"
                      : "bg-surface text-brand-ink hover:bg-brand-purple hover:text-white"
                  }`}
                >
                  {slot.cancelled ? "Restore" : "Cancel this one"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
