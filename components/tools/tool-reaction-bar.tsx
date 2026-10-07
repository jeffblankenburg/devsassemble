"use client";

import { toggleToolReaction } from "@/lib/tools/actions";
import { REACTION_EMOJIS } from "@/lib/repos/reactions";

const chip =
  "focus-comic inline-flex items-center gap-1 rounded-full border-[2px] border-brand-ink px-3 py-1 text-sm shadow-comic-sm transition-transform hover:-translate-y-0.5";

export function ToolReactionBar({
  toolId,
  reactions,
  myReactions,
  isAuthed,
  loginHref,
}: {
  toolId: string;
  reactions: Record<string, number>;
  myReactions: string[];
  isAuthed: boolean;
  loginHref: string;
}) {
  if (!isAuthed) {
    return (
      <div className="flex flex-wrap gap-2">
        {REACTION_EMOJIS.map((e) => (
          <a
            key={e}
            href={loginHref}
            title="Sign in to react"
            className={`${chip} bg-surface text-brand-ink`}
          >
            <span aria-hidden>{e}</span>
            {reactions[e] ? (
              <span className="font-mono text-xs">{reactions[e]}</span>
            ) : null}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {REACTION_EMOJIS.map((e) => {
        const active = myReactions.includes(e);
        const count = reactions[e] ?? 0;
        return (
          <form key={e} action={toggleToolReaction}>
            <input type="hidden" name="tool_id" value={toolId} />
            <input type="hidden" name="emoji" value={e} />
            <button
              type="submit"
              aria-pressed={active}
              className={`${chip} ${active ? "bg-brand-lime text-brand-ink" : "bg-surface text-brand-ink"}`}
            >
              <span aria-hidden>{e}</span>
              {count > 0 && <span className="font-mono text-xs">{count}</span>}
            </button>
          </form>
        );
      })}
    </div>
  );
}
