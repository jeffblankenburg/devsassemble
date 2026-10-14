import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth/dal";
import { listFeedback } from "@/lib/feedback/queries";
import { resolveFeedback } from "@/lib/feedback/actions";

export const metadata: Metadata = { title: "Feedback" };

const CATEGORY_STYLE: Record<string, string> = {
  bug: "bg-brand-purple text-white",
  idea: "bg-brand-lime text-brand-ink",
  question: "bg-brand-blue text-white",
  other: "bg-brand-cream text-brand-ink",
};

export default async function AdminFeedbackPage() {
  await requireCapability("manage_feedback");
  const items = await listFeedback();
  const open = items.filter((i) => i.status === "open");
  const resolved = items.filter((i) => i.status === "resolved");

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
        Feedback
      </h1>
      <p className="mt-2 text-brand-ink/70">
        {open.length} open · {resolved.length} resolved
      </p>

      {items.length === 0 ? (
        <p className="mt-8 text-brand-ink/60">No feedback yet.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {items.map((f) => {
            const from = f.author?.username
              ? `@${f.author.username}`
              : f.email
                ? f.email
                : "anonymous";
            return (
              <li
                key={f.id}
                className={`rounded-[var(--radius-comic)] border-ink p-4 shadow-comic-sm ${
                  f.status === "resolved" ? "bg-surface/60 opacity-70" : "bg-surface"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md border-[2px] border-brand-ink px-2 py-0.5 font-display text-xs uppercase tracking-wide ${
                      CATEGORY_STYLE[f.category] ?? CATEGORY_STYLE.other
                    }`}
                  >
                    {f.category}
                  </span>
                  <span className="font-mono text-xs text-brand-ink/60">
                    {from}
                  </span>
                  {f.page_url && (
                    <a
                      href={f.page_url}
                      className="focus-comic font-mono text-xs text-brand-blue underline"
                    >
                      {f.page_url}
                    </a>
                  )}
                  <form action={resolveFeedback} className="ml-auto">
                    <input type="hidden" name="id" value={f.id} />
                    <input
                      type="hidden"
                      name="reopen"
                      value={(f.status === "resolved").toString()}
                    />
                    <button
                      type="submit"
                      className="focus-comic rounded-md border-ink bg-white px-3 py-1 font-display text-xs uppercase tracking-wide text-brand-ink shadow-comic-sm hover:bg-brand-lime"
                    >
                      {f.status === "resolved" ? "Reopen" : "Resolve"}
                    </button>
                  </form>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-brand-ink/85">
                  {f.message}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
