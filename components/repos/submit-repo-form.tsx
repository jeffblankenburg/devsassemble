"use client";

import { useActionState } from "react";
import { submitRepo, type RepoFormState } from "@/lib/repos/actions";
import { ComicButton } from "@/components/brand/comic-button";

const inputClass =
  "rounded-[var(--radius-comic)] border-ink bg-white px-4 py-3 text-brand-ink outline-none focus:shadow-comic-sm";
const labelClass =
  "font-display text-lg uppercase tracking-wide text-brand-ink";

export function SubmitRepoForm() {
  const [state, action, pending] = useActionState<RepoFormState, FormData>(
    submitRepo,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className={labelClass}>GitHub URL</span>
        <input
          name="github_url"
          required
          placeholder="https://github.com/owner/repo"
          className={inputClass}
        />
        <span className="text-xs text-brand-ink/55">
          We&apos;ll pull the name, description, stars, and language automatically.
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Note</span>
        <textarea
          name="note"
          rows={3}
          maxLength={500}
          placeholder="What makes it useful or cool? (optional)"
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-4">
        <ComicButton variant="blue" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add to the board"}
        </ComicButton>
        {state.error && (
          <span className="text-sm text-brand-purple">{state.error}</span>
        )}
      </div>
    </form>
  );
}
