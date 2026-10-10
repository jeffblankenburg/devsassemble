"use client";

import { useTransition } from "react";
import { approveTodayBatch, toggleAutopilot } from "@/lib/tweets/actions";
import { ComicButton } from "@/components/brand/comic-button";

/**
 * Autopilot status + controls: kill-switch, and (in supervised mode) a one-tap
 * "Approve today's batch" that releases the planned drafts to the schedule.
 */
export function AutopilotPanel({
  enabled,
  mode,
  pending,
}: {
  enabled: boolean;
  mode: string;
  pending: number;
}) {
  const [approving, startApprove] = useTransition();
  const [toggling, startToggle] = useTransition();

  function flip() {
    startToggle(async () => {
      const fd = new FormData();
      fd.set("enabled", String(!enabled));
      await toggleAutopilot(fd);
    });
  }

  function approve() {
    startApprove(async () => {
      await approveTodayBatch();
    });
  }

  return (
    <div className="mt-6 rounded-[var(--radius-comic)] border-ink bg-surface p-4 shadow-comic">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-block h-3 w-3 rounded-full border-[2px] border-brand-ink ${
            enabled ? "bg-brand-lime" : "bg-brand-ink/20"
          }`}
          aria-hidden
        />
        <div className="min-w-0">
          <h2 className="font-display text-lg uppercase tracking-wide text-brand-ink">
            Autopilot
          </h2>
          <p className="text-sm text-brand-ink/65">
            {enabled
              ? `On · ${mode} — plans ~10 tweets/day, 8am–10pm ET.`
              : "Paused — no new batches will be planned."}
          </p>
        </div>

        <button
          type="button"
          onClick={flip}
          disabled={toggling}
          className="focus-comic ml-auto rounded-md border-ink bg-white px-3 py-1.5 font-display text-xs uppercase tracking-wide text-brand-ink shadow-comic-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {toggling ? "…" : enabled ? "Pause" : "Resume"}
        </button>
      </div>

      {enabled && mode === "supervised" && (
        <div className="mt-3 border-t-2 border-brand-ink/10 pt-3">
          {pending > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <ComicButton
                variant="lime"
                type="button"
                onClick={approve}
                disabled={approving}
              >
                {approving ? "Approving…" : `Approve today's batch (${pending})`}
              </ComicButton>
              <span className="text-sm text-brand-ink/60">
                Releases the planned drafts below to their scheduled times.
              </span>
            </div>
          ) : (
            <p className="text-sm text-brand-ink/55">
              No batch waiting — the next one is planned tomorrow morning.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
