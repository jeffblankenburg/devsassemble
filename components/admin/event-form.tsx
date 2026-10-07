"use client";

import { useActionState, type ReactNode } from "react";
import {
  createEvent,
  updateEvent,
  type EventFormState,
} from "@/lib/events/actions";
import { toDatetimeLocalValue } from "@/lib/events/format";
import { ComicButton } from "@/components/brand/comic-button";
import { ChoiceChips, ColorSwatches } from "@/components/ui/choice-chips";
import { ComicDateTimePicker } from "@/components/admin/comic-date-time-picker";
import { TitleSlugFields } from "@/components/admin/title-slug-fields";
import type { EventRow } from "@/lib/events/queries";

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

export function EventForm({
  mode,
  event,
}: {
  mode: "create" | "edit";
  event?: EventRow;
}) {
  const action = mode === "create" ? createEvent : updateEvent;
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {mode === "edit" && event && (
        <input type="hidden" name="id" value={event.id} />
      )}

      <TitleSlugFields
        defaultTitle={event?.title ?? ""}
        defaultSlug={event?.slug ?? ""}
        excludeId={event?.id}
      />

      <Field label="Summary" hint="Short blurb shown on cards (max 200 chars).">
        <input
          name="summary"
          defaultValue={event?.summary ?? ""}
          maxLength={200}
          placeholder="What this session is about, in a sentence."
          className={inputClass}
        />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          rows={5}
          defaultValue={event?.description ?? ""}
          placeholder="The full details."
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Starts" hint="Interpreted as the timezone below.">
          <ComicDateTimePicker
            name="starts_at"
            defaultValue={event ? toDatetimeLocalValue(event.starts_at) : undefined}
          />
        </Field>
        <Field label="Ends (optional)">
          <ComicDateTimePicker
            name="ends_at"
            defaultValue={
              event?.ends_at ? toDatetimeLocalValue(event.ends_at) : undefined
            }
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Timezone">
          <input
            name="timezone"
            defaultValue={event?.timezone ?? "America/New_York"}
            placeholder="America/New_York"
            className={inputClass}
          />
        </Field>
        <Field label="Host label">
          <input
            name="host"
            defaultValue={event?.host ?? ""}
            placeholder="Live build stream"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Location" hint="Leave blank for virtual-only.">
        <input
          name="location"
          defaultValue={event?.location ?? ""}
          placeholder="Virtual / Zoom / a city"
          className={inputClass}
        />
      </Field>

      <Field label="Format">
        <ChoiceChips
          name="is_virtual"
          defaultValue={(event?.is_virtual ?? true) ? "true" : "false"}
          options={[
            { value: "true", label: "Virtual" },
            { value: "false", label: "In person" },
          ]}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Accent">
          <ColorSwatches
            name="accent"
            defaultValue={event?.accent ?? "blue"}
            options={[
              { value: "blue", label: "Blue" },
              { value: "lime", label: "Lime" },
              { value: "purple", label: "Purple" },
            ]}
          />
        </Field>
        <Field label="Status" hint="Only published events are public.">
          <ChoiceChips
            name="status"
            defaultValue={event?.status ?? "draft"}
            options={[
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </Field>
      </div>

      <div className="flex items-center gap-4">
        <ComicButton variant="blue" type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create event"
              : "Save changes"}
        </ComicButton>
        {state.error && (
          <span className="text-sm text-brand-purple">{state.error}</span>
        )}
      </div>
    </form>
  );
}
