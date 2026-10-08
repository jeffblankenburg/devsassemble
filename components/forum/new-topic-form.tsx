"use client";

import { useActionState, type ReactNode } from "react";
import { createTopic, type ForumFormState } from "@/lib/forum/actions";
import { ComicButton } from "@/components/brand/comic-button";
import { MarkdownField } from "@/components/forum/markdown-toolbar";
import { ChoiceChips } from "@/components/ui/choice-chips";
import type { Category } from "@/lib/forum/queries";

const inputClass =
  "rounded-[var(--radius-comic)] border-ink bg-white px-4 py-3 text-brand-ink outline-none focus:shadow-comic-sm";
const labelClass =
  "font-display text-lg uppercase tracking-wide text-brand-ink";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className="text-xs text-brand-ink/55">{hint}</span>}
    </div>
  );
}

export function NewTopicForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(
    createTopic,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Category">
        <ChoiceChips
          name="category_id"
          required
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Field>

      <Field label="Title">
        <input
          name="title"
          required
          maxLength={140}
          placeholder="What do you want to talk about?"
          className={inputClass}
        />
      </Field>

      <Field label="Body" hint="Markdown supported — use the buttons or type it directly.">
        <MarkdownField
          name="body"
          rows={10}
          required
          placeholder="Share your thoughts…"
        />
      </Field>

      <div className="flex items-center gap-4">
        <ComicButton variant="blue" type="submit" disabled={pending}>
          {pending ? "Posting…" : "Post topic"}
        </ComicButton>
        {state.error && (
          <span className="text-sm text-brand-purple">{state.error}</span>
        )}
      </div>
    </form>
  );
}
