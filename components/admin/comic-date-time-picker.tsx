"use client";

import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Strict YYYY-MM-DD for live typing (no premature jumps while mid-entry).
function parseStrict(v: string): Date | undefined {
  const m = v.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return undefined;
  const [y, mo, d] = m.slice(1).map(Number);
  const dt = new Date(y, mo - 1, d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

// Looser parse on blur so "Oct 7, 2026" etc. also work.
function parseLoose(v: string): Date | undefined {
  const strict = parseStrict(v);
  if (strict) return strict;
  const loose = new Date(v.trim());
  return Number.isNaN(loose.getTime()) ? undefined : loose;
}

type Parsed = {
  date: Date | undefined;
  hour12: number;
  minute: number;
  ampm: "AM" | "PM";
};

function parseValue(value?: string): Parsed {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (m) {
    const [y, mo, d] = m.slice(1, 4).map(Number);
    const h = m[4] ? Number(m[4]) : 0;
    const min = m[5] ? Number(m[5]) : 0;
    return {
      date: new Date(y, mo - 1, d),
      hour12: ((h + 11) % 12) + 1,
      minute: min,
      ampm: h >= 12 ? "PM" : "AM",
    };
  }
  return { date: undefined, hour12: 12, minute: 0, ampm: "PM" };
}

const field =
  "rounded-md border-[2px] border-brand-ink bg-white px-2 py-1 text-brand-ink outline-none focus:shadow-comic-sm";

/**
 * Comic date + time picker. The date is typeable (YYYY-MM-DD, or looser on
 * blur) with an on-demand calendar; the time is a typeable 12h row. Writes a
 * hidden "YYYY-MM-DDTHH:mm" value the event action already understands.
 */
export function ComicDateTimePicker({
  name,
  defaultValue,
  dateOnly,
  onChange,
}: {
  name: string;
  defaultValue?: string;
  dateOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  const [init] = useState(() => parseValue(defaultValue));
  const [date, setDate] = useState<Date | undefined>(init.date);
  const [dateText, setDateText] = useState(init.date ? ymd(init.date) : "");
  const [open, setOpen] = useState(false);
  const [hour12, setHour12] = useState(init.hour12);
  const [minute, setMinute] = useState(init.minute);
  const [minuteText, setMinuteText] = useState(pad(init.minute));
  const [ampm, setAmpm] = useState<"AM" | "PM">(init.ampm);

  const h24 = ampm === "PM" ? (hour12 % 12) + 12 : hour12 % 12;
  const value = date
    ? dateOnly
      ? ymd(date)
      : `${ymd(date)}T${pad(h24)}:${pad(minute)}`
    : "";

  useEffect(() => {
    onChange?.(value);
  }, [value, onChange]);

  return (
    <div className="rounded-[var(--radius-comic)] border-ink bg-white p-3 shadow-comic-sm">
      <input type="hidden" name={name} value={value} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={dateText}
          onChange={(e) => {
            const v = e.target.value;
            setDateText(v);
            const d = parseStrict(v);
            if (d) setDate(d);
          }}
          onBlur={() => {
            const d = parseLoose(dateText);
            if (d) {
              setDate(d);
              setDateText(ymd(d));
            }
          }}
          placeholder="YYYY-MM-DD"
          aria-label="Date"
          className={`${field} w-36`}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Hide calendar" : "Pick from calendar"}
          className="focus-comic flex h-9 w-9 items-center justify-center rounded-md border-ink bg-surface shadow-comic-sm hover:bg-brand-lime"
        >
          <span aria-hidden>📅</span>
        </button>

        {!dateOnly && (
          <>
            <span className="mx-1 font-display text-sm uppercase tracking-wide text-brand-ink/50">
              at
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
              className={`${field} w-14 text-center font-mono`}
            />
            <span className="font-display text-brand-ink">:</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={minuteText}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                setMinuteText(digits);
                setMinute(Math.min(59, Number(digits) || 0));
              }}
              onBlur={() => setMinuteText(pad(Math.min(59, minute)))}
              aria-label="Minute"
              className={`${field} w-14 text-center font-mono`}
            />
            <div className="flex gap-1">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmpm(p)}
                  aria-pressed={ampm === p}
                  className={`focus-comic rounded-md border-[2px] border-brand-ink px-3 py-1 font-display text-sm uppercase ${
                    ampm === p
                      ? "bg-brand-blue text-white"
                      : "bg-surface text-brand-ink"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {open && (
        <div className="cal-comic mt-3 border-t-2 border-brand-ink/10 pt-3">
          <DayPicker
            mode="single"
            selected={date}
            onSelect={(d) => {
              setDate(d);
              if (d) setDateText(ymd(d));
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
