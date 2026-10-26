"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  updateRepoNote,
  resyncRepo,
  deleteRepo,
  type RepoFormState,
} from "@/lib/repos/actions";

const ctl =
  "focus-comic rounded-md border-ink bg-surface px-3 py-1 font-display text-xs uppercase tracking-wide text-brand-ink shadow-comic-sm hover:bg-brand-lime disabled:opacity-50";
const danger =
  "focus-comic rounded-md border-ink bg-brand-purple px-3 py-1 font-display text-xs uppercase tracking-wide text-white shadow-comic-sm disabled:opacity-50";
const ghost =
  "focus-comic font-mono text-xs uppercase tracking-widest text-muted hover:text-brand-ink";

function SubmitButton({
  className,
  pendingLabel,
  children,
}: {
  className: string;
  pendingLabel: string;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Owner/admin controls on a project: edit the note, re-sync, or delete. */
export function RepoOwnerControls({
  id,
  note,
}: {
  id: string;
  note: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Close the inline editor on a successful save. Doing it in the action
  // wrapper (an event-driven context) avoids a setState-in-effect cascade.
  const [state, formAction] = useActionState(
    async (prev: RepoFormState, formData: FormData) => {
      const result = await updateRepoNote(prev, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    {} as RepoFormState,
  );

  if (editing) {
    return (
      <form action={formAction} className="mt-4 flex flex-col gap-2">
        <input type="hidden" name="id" value={id} />
        <textarea
          name="note"
          rows={3}
          maxLength={500}
          defaultValue={note ?? ""}
          placeholder="Why you're sharing this…"
          className="focus-comic w-full resize-y rounded-[var(--radius-comic)] border-ink bg-white p-3 text-brand-ink shadow-comic"
        />
        {state.error && (
          <p className="font-mono text-xs text-brand-purple">{state.error}</p>
        )}
        <div className="flex items-center gap-3">
          <SubmitButton className={ctl} pendingLabel="Saving…">
            Save note
          </SubmitButton>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={ghost}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setEditing(true)} className={ctl}>
        Edit note
      </button>

      <form action={resyncRepo}>
        <input type="hidden" name="id" value={id} />
        <SubmitButton className={ctl} pendingLabel="Syncing…">
          Re-sync from GitHub
        </SubmitButton>
      </form>

      {confirmDelete ? (
        <form action={deleteRepo} className="flex items-center gap-2">
          <input type="hidden" name="id" value={id} />
          <span className="font-mono text-xs uppercase tracking-widest text-muted">
            Delete this project?
          </span>
          <SubmitButton className={danger} pendingLabel="Deleting…">
            Yes, delete
          </SubmitButton>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className={ghost}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className={danger}
        >
          Delete
        </button>
      )}
    </div>
  );
}
