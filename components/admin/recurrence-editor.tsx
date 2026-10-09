"use client";

import { useState } from "react";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { ComicDateTimePicker } from "@/components/admin/comic-date-time-picker";
import {
  WEEKDAYS,
  describeRecurrence,
  weekdayOrdinal,
  weekdayCode,
  type RecurFreq,
  type MonthMode,
  type EndMode,
} from "@/lib/events/rrule";

const inputClass =
  "rounded-[var(--radius-comic)] border-ink bg-white px-3 py-2 text-brand-ink outline-none focus:shadow-comic-sm w-24";
const labelClass = "font-display text-lg uppercase tracking-wide text-brand-ink";

export type RecurrenceInitial = {
  freq: RecurFreq;
  interval: number;
  byday: string[];
  monthMode: MonthMode;
  end: EndMode;
  count: number | null;
  until: string | null;
};

const UNIT: Record<Exclude<RecurFreq, "none">, string> = {
  daily: "days",
  weekly: "weeks",
  monthly: "months",
  yearly: "years",
};

export function RecurrenceEditor({
  initial,
  start,
}: {
  initial: RecurrenceInitial;
  /** Local start date for monthly labels (null on create until picked). */
  start: { year: number; month: number; day: number } | null;
}) {
  const [freq, setFreq] = useState<RecurFreq>(initial.freq);
  const [interval, setInterval] = useState(initial.interval);
  const [byday, setByday] = useState<string[]>(initial.byday);
  const [monthMode, setMonthMode] = useState<MonthMode>(initial.monthMode);
  const [end, setEnd] = useState<EndMode>(initial.end);
  const [count, setCount] = useState<number | null>(initial.count);

  const toggleDay = (code: string) =>
    setByday((cur) =>
      cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code],
    );

  // Monthly option labels derived from the start date.
  const monthDayLabel = start ? `On day ${start.day}` : "On that day of the month";
  const monthWeekdayLabel = start
    ? (() => {
        const ord = weekdayOrdinal(start.day);
        const label =
          ord >= 5 ? "last" : ["first", "second", "third", "fourth"][ord - 1];
        const w = WEEKDAYS.find(
          (x) => x.code === weekdayCode(start.year, start.month, start.day),
        );
        return `On the ${label} ${w?.full ?? ""}`;
      })()
    : "On that weekday";

  const summary = describeRecurrence(
    { freq, interval, byday, monthMode, end, count, until: initial.until },
    start ?? undefined,
  );

  return (
    <div className="flex flex-col gap-3">
      <span className={labelClass}>Repeats</span>

      <ChoiceChips
        name="recur_freq"
        defaultValue={freq}
        onChange={(v) => setFreq(v as RecurFreq)}
        options={[
          { value: "none", label: "Never" },
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
          { value: "yearly", label: "Yearly" },
        ]}
      />

      {freq !== "none" && (
        <>
          <div className="flex items-center gap-2 text-brand-ink">
            <span className="text-sm">Every</span>
            <input
              type="number"
              name="recur_interval"
              min={1}
              max={999}
              value={interval}
              onChange={(e) => setInterval(Math.max(1, Number(e.target.value) || 1))}
              className={inputClass}
            />
            <span className="text-sm">{UNIT[freq]}</span>
          </div>

          {freq === "weekly" && (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1">
                {WEEKDAYS.map((w) => {
                  const on = byday.includes(w.code);
                  return (
                    <button
                      key={w.code}
                      type="button"
                      onClick={() => toggleDay(w.code)}
                      className={`focus-comic h-9 w-11 rounded-md border-ink font-display text-xs uppercase shadow-comic-sm transition-transform hover:-translate-y-0.5 ${
                        on ? "bg-brand-blue text-white" : "bg-white text-brand-ink"
                      }`}
                    >
                      {w.short}
                    </button>
                  );
                })}
              </div>
              <input type="hidden" name="recur_byday" value={byday.join(",")} />
              <span className="text-xs text-brand-ink/55">
                Leave all off to use the start day&apos;s weekday.
              </span>
            </div>
          )}

          {freq === "monthly" && (
            <ChoiceChips
              name="recur_month_mode"
              defaultValue={monthMode}
              onChange={(v) => setMonthMode(v as MonthMode)}
              options={[
                { value: "dayofmonth", label: monthDayLabel },
                { value: "weekday", label: monthWeekdayLabel },
              ]}
            />
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm text-brand-ink/70">Ends</span>
            <ChoiceChips
              name="recur_end"
              defaultValue={end}
              onChange={(v) => setEnd(v as EndMode)}
              options={[
                { value: "never", label: "Never" },
                { value: "count", label: "After N times" },
                { value: "until", label: "On a date" },
              ]}
            />
            {end === "count" && (
              <div className="flex items-center gap-2 text-brand-ink">
                <span className="text-sm">After</span>
                <input
                  type="number"
                  name="recur_count"
                  min={1}
                  max={999}
                  value={count ?? 10}
                  onChange={(e) =>
                    setCount(Math.max(1, Number(e.target.value) || 1))
                  }
                  className={inputClass}
                />
                <span className="text-sm">occurrences</span>
              </div>
            )}
            {end === "until" && (
              <ComicDateTimePicker
                name="recur_until"
                dateOnly
                defaultValue={initial.until ?? undefined}
              />
            )}
          </div>

          <p className="rounded-[var(--radius-comic)] border-[2px] border-brand-ink/20 bg-brand-cream px-3 py-2 text-sm text-brand-ink">
            {summary}
            <span className="text-brand-ink/50">
              {" "}
              — subscribers&apos; calendars repeat this automatically.
            </span>
          </p>
        </>
      )}
    </div>
  );
}
