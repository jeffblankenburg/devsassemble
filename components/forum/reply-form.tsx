"use client";

import { useActionState, useEffect, useRef } from "react";
import { createReply, type ForumFormState } from "@/lib/forum/actions";
import { ComicButton } from "@/components/brand/comic-button";

export function ReplyForm({
  topicId,
  slug,
}: {
  topicId: string;
  slug: string;
}) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(
    createReply,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="topic_id" value={topicId} />
      <input type="hidden" name="slug" value={slug} />
      <textarea
        name="body"
        rows={4}
        required
        placeholder="Write a reply… markdown supported."
        className="rounded-[var(--radius-comic)] border-ink bg-white px-4 py-3 text-brand-ink outline-none focus:shadow-comic-sm"
      />
      <div className="flex items-center gap-4">
        <ComicButton variant="blue" type="submit" disabled={pending}>
          {pending ? "Posting…" : "Reply"}
        </ComicButton>
        {state.error && (
          <span className="text-sm text-brand-purple">{state.error}</span>
        )}
      </div>
    </form>
  );
}
