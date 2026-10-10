import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { listSurveyResponses } from "@/lib/survey/queries";
import { SURVEY_QUESTIONS, type SurveyQuestion } from "@/lib/survey/questions";

export const metadata: Metadata = { title: "Survey results" };

function tally(
  rows: Awaited<ReturnType<typeof listSurveyResponses>>,
  q: SurveyQuestion,
): { option: string; count: number }[] {
  const counts = new Map<string, number>(q.options.map((o) => [o, 0]));
  for (const row of rows) {
    if (q.multi) {
      const vals = (row[q.key as "coding_tools" | "observability" | "goals"] ??
        []) as string[];
      for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
    } else {
      const v = row[q.key as "persona" | "experience"];
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  return q.options.map((o) => ({ option: o, count: counts.get(o) ?? 0 }));
}

export default async function AdminSurveyPage() {
  await requireAdmin();
  const rows = await listSurveyResponses();
  const total = rows.length;
  const buildings = rows
    .map((r) => r.building)
    .filter((b): b is string => Boolean(b && b.trim()));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
        Survey results
      </h1>
      <p className="mt-2 text-brand-ink/70">
        {total} {total === 1 ? "response" : "responses"} from the registration
        survey.
      </p>

      {total === 0 ? (
        <p className="mt-8 text-brand-ink/60">No responses yet.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {SURVEY_QUESTIONS.map((q) => {
            const results = tally(rows, q).sort((a, b) => b.count - a.count);
            return (
              <section key={q.key}>
                <h2 className="font-display text-xl uppercase tracking-wide text-brand-ink">
                  {q.label}
                </h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {results.map((r) => {
                    const pct = total ? Math.round((r.count / total) * 100) : 0;
                    return (
                      <li key={r.option} className="flex items-center gap-3">
                        <span className="w-56 shrink-0 text-sm text-brand-ink/85">
                          {r.option}
                        </span>
                        <div className="h-4 flex-1 overflow-hidden rounded-md border-[2px] border-brand-ink bg-white">
                          <div
                            className="h-full bg-brand-blue"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-16 shrink-0 text-right font-mono text-xs text-brand-ink/70">
                          {r.count} · {pct}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {buildings.length > 0 && (
            <section>
              <h2 className="font-display text-xl uppercase tracking-wide text-brand-ink">
                What they&apos;re building
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {buildings.map((b, i) => (
                  <li
                    key={i}
                    className="rounded-[var(--radius-comic)] border-[2px] border-brand-ink/30 bg-surface px-3 py-2 text-sm text-brand-ink/85"
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
