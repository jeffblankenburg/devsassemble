"use client";

import { useActionState } from "react";
import { submitTool, type ToolFormState } from "@/lib/tools/actions";
import { ComicButton } from "@/components/brand/comic-button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { TOOL_CATEGORIES } from "@/lib/tools/categories";

const inputClass =
  "rounded-[var(--radius-comic)] border-ink bg-white px-4 py-3 text-brand-ink outline-none focus:shadow-comic-sm";
const labelClass =
  "font-display text-lg uppercase tracking-wide text-brand-ink";

export function SubmitToolForm() {
  const [state, action, pending] = useActionState<ToolFormState, FormData>(
    submitTool,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className={labelClass}>Tool name</span>
        <input
          name="name"
          required
          maxLength={80}
          placeholder="e.g. Entire"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>URL</span>
        <input
          name="url"
          type="url"
          required
          placeholder="https://entire.io"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Category</span>
        <ChoiceChips
          name="category"
          defaultValue="ai"
          options={TOOL_CATEGORIES.map((c) => ({
            value: c.value,
            label: c.label,
          }))}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Why it&apos;s in your toolbelt</span>
        <textarea
          name="description"
          rows={3}
          maxLength={500}
          placeholder="What makes it worth a spot in your toolbelt? (optional)"
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-4">
        <ComicButton variant="blue" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add to the shelf"}
        </ComicButton>
        {state.error && (
          <span className="text-sm text-brand-purple">{state.error}</span>
        )}
      </div>
    </form>
  );
}
