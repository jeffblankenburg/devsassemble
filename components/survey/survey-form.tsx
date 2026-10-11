"use client";

import { useState, useTransition } from "react";
import {
  SURVEY_QUESTIONS,
  BUILDING_MAX,
  type SingleKey,
  type MultiKey,
} from "@/lib/survey/questions";
import { submitSurvey } from "@/lib/survey/actions";
import { ComicButton } from "@/components/brand/comic-button";

const MULTI_KEYS: MultiKey[] = [
  "coding_tools",
  "observability",
  "hosting",
  "databases",
  "goals",
];

export function SurveyForm({ next }: { next?: string }) {
  const [single, setSingle] = useState<Record<string, string>>({});
  const [multi, setMulti] = useState<Record<string, string[]>>({
    coding_tools: [],
    observability: [],
    hosting: [],
    databases: [],
    goals: [],
  });
  const [building, setBuilding] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pickSingle(key: string, option: string) {
    setSingle((s) => ({ ...s, [key]: option }));
  }
  function toggleMulti(key: string, option: string) {
    setMulti((m) => {
      const cur = m[key] ?? [];
      return {
        ...m,
        [key]: cur.includes(option)
          ? cur.filter((o) => o !== option)
          : [...cur, option],
      };
    });
  }

  const complete =
    !!single.persona &&
    !!single.experience &&
    MULTI_KEYS.every((k) => (multi[k]?.length ?? 0) > 0);

  function onSubmit() {
    setError(null);
    start(async () => {
      const res = await submitSurvey({
        persona: single.persona ?? "",
        experience: single.experience ?? "",
        coding_tools: multi.coding_tools ?? [],
        observability: multi.observability ?? [],
        hosting: multi.hosting ?? [],
        databases: multi.databases ?? [],
        goals: multi.goals ?? [],
        building,
        next,
      });
      if (res?.error) setError(res.error);
      // On success the action redirects — nothing to do here.
    });
  }

  return (
    <div className="flex flex-col gap-7">
      {SURVEY_QUESTIONS.map((q) => {
        const selected = q.multi
          ? (multi[q.key] ?? [])
          : single[q.key]
            ? [single[q.key]]
            : [];
        return (
          <fieldset key={q.key}>
            <legend className="font-display text-lg uppercase tracking-wide text-brand-ink">
              {q.label}
              {q.multi && (
                <span className="ml-2 font-mono text-xs normal-case tracking-normal text-brand-ink/45">
                  pick any
                </span>
              )}
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {q.options.map((option) => {
                const isOn = selected.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() =>
                      q.multi
                        ? toggleMulti(q.key as MultiKey, option)
                        : pickSingle(q.key as SingleKey, option)
                    }
                    className={`focus-comic rounded-md border-[2px] border-brand-ink px-3 py-1.5 font-display text-sm uppercase tracking-wide shadow-comic-sm transition-transform hover:-translate-y-0.5 ${
                      isOn
                        ? "bg-brand-blue text-white"
                        : "bg-white text-brand-ink"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <fieldset>
        <legend className="font-display text-lg uppercase tracking-wide text-brand-ink">
          What are you building right now?
          <span className="ml-2 font-mono text-xs normal-case tracking-normal text-brand-ink/45">
            optional
          </span>
        </legend>
        <input
          type="text"
          value={building}
          maxLength={BUILDING_MAX}
          onChange={(e) => setBuilding(e.target.value)}
          placeholder="One line about your current project…"
          className="mt-3 w-full rounded-[var(--radius-comic)] border-ink bg-white px-3 py-2 text-brand-ink outline-none placeholder:text-brand-ink/40 focus:shadow-comic-sm"
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t-2 border-brand-ink/10 pt-5">
        <ComicButton
          variant="lime"
          type="button"
          onClick={onSubmit}
          disabled={pending || !complete}
        >
          {pending ? "Saving…" : "Enter DevsAssemble"}
        </ComicButton>
        {!complete && (
          <span className="text-sm text-brand-ink/55">
            Answer the five questions above to continue.
          </span>
        )}
        {error && <span className="text-sm text-brand-purple">{error}</span>}
      </div>
    </div>
  );
}
