import type { EventRow } from "@/lib/events/queries";
import { listOccurrenceSlots } from "@/lib/events/recurrence";
import {
  formatFullDate,
  formatTime,
  tzLabel,
  toDatetimeLocalValue,
} from "@/lib/events/format";
import { OccurrenceRow } from "@/components/admin/occurrence-row";

/**
 * Admin control for a recurring series' individual occurrences. Each upcoming
 * date can be cancelled (EXDATE), restored, or moved to a different date/time
 * (a RECURRENCE-ID override) — e.g. shift the pre-holiday meetup a week earlier.
 */
export function OccurrenceManager({ event }: { event: EventRow }) {
  if (!event.rrule) return null;

  const tz = event.timezone;
  const slots = listOccurrenceSlots(event, new Date(), 10);

  const label = (iso: string) =>
    `${formatFullDate(iso, tz)} · ${formatTime(iso, tz)} ${tzLabel(tz)}`;

  return (
    <section className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
      <h2 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
        Upcoming occurrences
      </h2>
      <p className="mt-1 text-sm text-brand-ink/70">
        Cancel a single date (e.g. a holiday), or move one to a different time —
        the rest of the series is unchanged. Both sync to subscribed calendars.
      </p>

      {slots.length === 0 ? (
        <p className="mt-4 font-mono text-sm text-muted">
          No upcoming occurrences.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {slots.map((slot) => (
            <OccurrenceRow
              key={slot.date}
              eventId={event.id}
              date={slot.date}
              origLabel={label(slot.iso)}
              movedLabel={slot.movedToIso ? label(slot.movedToIso) : null}
              cancelled={slot.cancelled}
              moveDefault={toDatetimeLocalValue(slot.movedToIso ?? slot.iso, tz)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
