"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

type Parsed = {
  date: Date | undefined;
  hour12: number;
  minute: number;
  ampm: "AM" | "PM";
};

// Parse a stored "YYYY-MM-DDTHH:mm" value into calendar + 12h-clock parts.
function parseValue(value?: string): Parsed {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) {
    const [y, mo, d, h, min] = m.slice(1).map(Number);
    return {
      date: new Date(y, mo - 1, d),
      hour12: ((h + 11) % 12) + 1,
      minute: min,
      ampm: h >= 12 ? "PM" : "AM",
    };
  }
  return { date: undefined, hour12: 12, minute: 0, ampm: "PM" };
}

const timeInput =
  "w-16 rounded-md border-[2px] border-brand-ink bg-white px-2 py-1 text-center font-mono text-brand-ink outline-none focus:shadow-comic-sm";

/**
 * Comic date + time picker. Inline calendar (react-day-picker, brand-skinned) +
 * a custom 12h time row. Writes a hidden "YYYY-MM-DDTHH:mm" value that the event
 * action already understands. Replaces the native datetime-local input.
 */
export function ComicDateTimePicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const [parsed] = useState(() => parseValue(defaultValue));
  const [date, setDate] = useState<Date | undefined>(parsed.date);
  const [hour12, setHour12] = useState(parsed.hour12);
  const [minute, setMinute] = useState(parsed.minute);
  const [ampm, setAmpm] = useState<"AM" | "PM">(parsed.ampm);

  const h24 = ampm === "PM" ? (hour12 % 12) + 12 : hour12 % 12;
  const value = date
    ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(h24)}:${pad(minute)}`
    : "";

  return (
    <div className="rounded-[var(--radius-comic)] border-ink bg-white p-3 shadow-comic-sm">
      <input type="hidden" name={name} value={value} />
      <div className="cal-comic">
        <DayPicker mode="single" selected={date} onSelect={setDate} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t-2 border-brand-ink/10 pt-3">
        <span className="font-display text-sm uppercase tracking-wide text-brand-ink">
          Time
        </span>
        <input
          type="number"
          min={1}
          max={12}
          value={hour12}
          onChange={(e) =>
            setHour12(Math.min(12, Math.max(1, Number(e.target.value) || 1)))
          }
          aria-label="Hour"
          className={timeInput}
        />
        <span className="font-display text-brand-ink">:</span>
        <input
          type="number"
          min={0}
          max={59}
          value={minute}
          onChange={(e) =>
            setMinute(Math.min(59, Math.max(0, Number(e.target.value) || 0)))
          }
          aria-label="Minute"
          className={timeInput}
        />
        <div className="flex gap-1">
          {(["AM", "PM"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmpm(p)}
              aria-pressed={ampm === p}
              className={`focus-comic rounded-md border-[2px] border-brand-ink px-3 py-1 font-display text-sm uppercase ${
                ampm === p ? "bg-brand-blue text-white" : "bg-surface text-brand-ink"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
