"use client";

import { useActionState, useState } from "react";
import {
  approveAndPost,
  rejectTweet,
  generateNow,
  type TweetActionState,
} from "@/lib/tweets/actions";
import { tweetLength, TWEET_MAX } from "@/lib/tweets/length";
import { ComicButton } from "@/components/brand/comic-button";
import type { TweetRow, TweetAlternative } from "@/lib/tweets/queries";

function KindTag({ kind }: { kind: string }) {
  return (
    <span className="rounded-md border-[2px] border-brand-ink bg-brand-cream px-2 py-0.5 font-display text-xs uppercase tracking-wide text-brand-ink">
      {kind}
    </span>
  );
}

export function GenerateButton() {
  const [state, action, pending] = useActionState<TweetActionState, FormData>(
    generateNow,
    {},
  );
  return (
    <form action={action} className="flex items-center gap-3">
      <ComicButton variant="lime" type="submit" disabled={pending}>
        {pending ? "Drafting…" : "Generate drafts now"}
      </ComicButton>
      {state.error && (
        <span className="text-sm text-brand-purple">{state.error}</span>
      )}
      {state.ok && <span className="text-sm text-brand-ink/60">New draft added.</span>}
    </form>
  );
}

function TweetCard({ draft }: { draft: TweetRow }) {
  const [body, setBody] = useState(draft.body);
  const [state, action, pending] = useActionState<TweetActionState, FormData>(
    approveAndPost,
    {},
  );

  const len = tweetLength(body);
  const over = len > TWEET_MAX;

  if (state.ok) {
    return (
      <li className="rounded-[var(--radius-comic)] border-ink bg-brand-lime/30 p-4 shadow-comic">
        <p className="font-display uppercase tracking-wide text-brand-ink">
          Posted ✓
        </p>
        <div className="mt-1 flex flex-wrap gap-3 text-sm">
          {state.url && (
            <a
              href={state.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-comic text-brand-blue underline"
            >
              View on X
            </a>
          )}
          {state.blueskyUrl && (
            <a
              href={state.blueskyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-comic text-brand-blue underline"
            >
              View on Bluesky
            </a>
          )}
        </div>
        {state.warning && (
          <p className="mt-1 text-sm text-brand-purple">{state.warning}</p>
        )}
      </li>
    );
  }

  return (
    <li className="rounded-[var(--radius-comic)] border-ink bg-surface p-4 shadow-comic">
      <div className="flex flex-wrap items-center gap-2">
        <KindTag kind={draft.kind} />
        <span className="font-mono text-xs uppercase tracking-widest text-brand-ink/50">
          for {draft.created_for}
        </span>
        <span
          className={`ml-auto font-mono text-xs ${over ? "text-brand-purple" : "text-brand-ink/55"}`}
        >
          {len}/{TWEET_MAX}
        </span>
      </div>

      {draft.rationale && (
        <p className="mt-2 text-xs italic text-brand-ink/55">{draft.rationale}</p>
      )}

      <form action={action} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="id" value={draft.id} />
        <input type="hidden" name="source_url" value={draft.source_url ?? ""} />
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-[var(--radius-comic)] border-ink bg-white px-3 py-2 text-brand-ink outline-none focus:shadow-comic-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <ComicButton
            variant="blue"
            type="submit"
            disabled={pending || over || body.trim().length === 0}
          >
            {pending ? "Posting…" : "Approve & post"}
          </ComicButton>
          {state.error && (
            <span className="text-sm text-brand-purple">{state.error}</span>
          )}
        </div>
      </form>

      {draft.alternatives.length > 0 && (
        <div className="mt-3 border-t-2 border-brand-ink/10 pt-3">
          <p className="font-display text-xs uppercase tracking-wide text-brand-ink/50">
            Other options
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {draft.alternatives.map((alt: TweetAlternative, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setBody(alt.body)}
                  className="focus-comic shrink-0 rounded-md border-[2px] border-brand-ink bg-brand-cream px-2 py-0.5 font-display text-xs uppercase text-brand-ink hover:-translate-y-0.5"
                >
                  Use
                </button>
                <span className="text-brand-ink/80">{alt.body}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form action={rejectTweet} className="mt-3">
        <input type="hidden" name="id" value={draft.id} />
        <button
          type="submit"
          className="focus-comic text-xs uppercase tracking-wide text-brand-ink/50 hover:text-brand-purple"
        >
          Reject draft
        </button>
      </form>
    </li>
  );
}

export function TweetQueue({ drafts }: { drafts: TweetRow[] }) {
  if (drafts.length === 0) {
    return (
      <p className="mt-6 text-brand-ink/70">
        No drafts waiting. Use “Generate drafts now” or wait for the daily run.
      </p>
    );
  }
  return (
    <ul className="mt-6 flex flex-col gap-4">
      {drafts.map((d) => (
        <TweetCard key={d.id} draft={d} />
      ))}
    </ul>
  );
}
