"use client";

import { useState } from "react";
import {
  skipOccurrence,
  restoreOccurrence,
  moveOccurrence,
  resetOccurrence,
} from "@/lib/events/actions";
import { ComicDateTimePicker } from "@/components/admin/comic-date-time-picker";

const btn =
  "focus-comic shrink-0 rounded-md border-[2px] border-brand-ink px-3 py-1 font-display text-xs uppercase shadow-comic-sm";

export function OccurrenceRow({
  eventId,
  date,
  origLabel,
  movedLabel,
  cancelled,
  moveDefault,
}: {
  eventId: string;
  date: string;
  origLabel: string;
  movedLabel: string | null;
  cancelled: boolean;
  moveDefault: string;
}) {
  const [showMove, setShowMove] = useState(false);

  return (
    <li className="rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-sm text-brand-ink">
          {movedLabel ? (
            <>
              <span className="text-brand-ink/40 line-through">{origLabel}</span>
              {" → "}
              <span className="font-semibold">{movedLabel}</span>
            </>
          ) : (
            <span className={cancelled ? "text-brand-ink/50 line-through" : ""}>
              {origLabel}
            </span>
          )}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {movedLabel && (
            <form action={resetOccurrence}>
              <input type="hidden" name="id" value={eventId} />
              <input type="hidden" name="date" value={date} />
              <button type="submit" className={`${btn} bg-surface text-brand-ink hover:bg-brand-cream`}>
                Reset time
              </button>
            </form>
          )}

          {!cancelled && (
            <button
              type="button"
              onClick={() => setShowMove((s) => !s)}
              className={`${btn} bg-surface text-brand-ink hover:bg-brand-blue hover:text-white`}
            >
              {showMove ? "Close" : "Move…"}
            </button>
          )}

          <form action={cancelled ? restoreOccurrence : skipOccurrence}>
            <input type="hidden" name="id" value={eventId} />
            <input type="hidden" name="date" value={date} />
            <button
              type="submit"
              className={`${btn} ${
                cancelled
                  ? "bg-brand-lime text-brand-ink"
                  : "bg-surface text-brand-ink hover:bg-brand-purple hover:text-white"
              }`}
            >
              {cancelled ? "Restore" : "Cancel this one"}
            </button>
          </form>
        </div>
      </div>

      {showMove && !cancelled && (
        <form
          action={moveOccurrence}
          className="mt-3 flex flex-wrap items-center gap-2 border-t-2 border-brand-ink/10 pt-3"
        >
          <input type="hidden" name="id" value={eventId} />
          <input type="hidden" name="date" value={date} />
          <span className="text-sm text-brand-ink/70">Move to</span>
          <ComicDateTimePicker name="to" defaultValue={moveDefault} />
          <button type="submit" className={`${btn} bg-brand-blue text-white`}>
            Move
          </button>
        </form>
      )}
    </li>
  );
}
