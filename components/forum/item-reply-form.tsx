"use client";

import { useActionState, useEffect, useRef } from "react";
import { createItemReply, type ForumFormState } from "@/lib/forum/actions";
import { ComicButton } from "@/components/brand/comic-button";
import { MarkdownField } from "@/components/forum/markdown-toolbar";

/** Reply composer for a project/tool discussion (starts the thread if new). */
export function ItemReplyForm({
  itemType,
  itemId,
  itemTitle,
  itemPath,
}: {
  itemType: "project" | "tool";
  itemId: string;
  itemTitle: string;
  itemPath: string;
}) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(
    createItemReply,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="item_type" value={itemType} />
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="item_title" value={itemTitle} />
      <input type="hidden" name="item_path" value={itemPath} />
      <MarkdownField
        name="body"
        rows={4}
        required
        placeholder="Add to the discussion… markdown supported."
      />
      <div className="flex items-center gap-4">
        <ComicButton variant="blue" type="submit" disabled={pending}>
          {pending ? "Posting…" : "Post"}
        </ComicButton>
        {state.error && (
          <span className="text-sm text-brand-purple">{state.error}</span>
        )}
      </div>
    </form>
  );
}
