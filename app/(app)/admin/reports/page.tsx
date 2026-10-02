import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { listOpenReports } from "@/lib/forum/queries";
import { resolveReport } from "@/lib/forum/actions";
import { AuthorChip } from "@/components/forum/author-chip";
import { formatDate } from "@/lib/forum/format";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  await requireAdmin();
  const reports = await listOpenReports();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
        Reports
      </h1>
      <p className="mt-2 text-brand-ink/70">Open moderation reports.</p>

      {reports.length === 0 ? (
        <p className="mt-8 text-brand-ink/70">Nothing to review — queue is clear.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {reports.map((r) => (
            <li
              key={r.id}
              className="rounded-[var(--radius-comic)] border-ink bg-surface p-4 shadow-comic"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border-[2px] border-brand-ink bg-brand-cream px-2 py-0.5 font-display text-xs uppercase text-brand-ink">
                  {r.target_type}
                </span>
                <span className="font-mono text-xs text-brand-ink/60">
                  {r.target_id}
                </span>
                <span className="ml-auto font-mono text-xs uppercase tracking-widest text-muted">
                  {formatDate(r.created_at)}
                </span>
              </div>

              {r.reason && (
                <p className="mt-2 text-brand-ink/85">“{r.reason}”</p>
              )}

              <div className="mt-2 flex items-center gap-2 text-sm text-brand-ink/60">
                <span>Reported by</span>
                <AuthorChip author={r.reporter} />
              </div>

              <div className="mt-3 flex gap-2">
                <form action={resolveReport}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="resolved" />
                  <button
                    type="submit"
                    className="focus-comic rounded-md border-ink bg-brand-lime px-3 py-1 font-display text-xs uppercase tracking-wide text-brand-ink shadow-comic-sm"
                  >
                    Mark resolved
                  </button>
                </form>
                <form action={resolveReport}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="dismissed" />
                  <button
                    type="submit"
                    className="focus-comic rounded-md border-ink bg-surface px-3 py-1 font-display text-xs uppercase tracking-wide text-brand-ink shadow-comic-sm hover:bg-brand-cream"
                  >
                    Dismiss
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
