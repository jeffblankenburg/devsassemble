"use client";

import { useActionState } from "react";
import { reportContent, type ForumFormState } from "@/lib/forum/actions";

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "topic" | "post";
  targetId: string;
}) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(
    reportContent,
    {},
  );

  if (state.ok) {
    return (
      <span className="font-mono text-xs uppercase tracking-widest text-muted">
        Reported ✓
      </span>
    );
  }

  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-muted hover:text-brand-purple">
        Report
      </summary>
      <form action={action} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="target_type" value={targetType} />
        <input type="hidden" name="target_id" value={targetId} />
        <input
          name="reason"
          maxLength={500}
          placeholder="Reason (optional)"
          className="rounded-md border-[2px] border-brand-ink px-2 py-1 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="focus-comic self-start rounded-md border-ink bg-brand-purple px-3 py-1 font-display text-xs uppercase text-white"
        >
          {pending ? "…" : "Submit report"}
        </button>
        {state.error && (
          <span className="text-xs text-brand-purple">{state.error}</span>
        )}
      </form>
    </details>
  );
}
