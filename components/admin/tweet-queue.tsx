"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  approveAndPost,
  scheduleTweet,
  rejectTweet,
  generateNow,
  type TweetActionState,
} from "@/lib/tweets/actions";
import { tweetLength, TWEET_MAX } from "@/lib/tweets/length";
import { ComicButton } from "@/components/brand/comic-button";
import { ComicDateTimePicker } from "@/components/admin/comic-date-time-picker";
import type { TweetRow } from "@/lib/tweets/queries";

// Each tweet kind gets its own label color so the list scans at a glance.
const KIND_STYLES: Record<string, string> = {
  event: "bg-brand-blue text-white",
  project: "bg-brand-purple text-white",
  tool: "bg-brand-lime text-brand-ink",
  discussion: "bg-brand-cream text-brand-ink",
  news: "bg-brand-ink text-white",
  evergreen: "bg-white text-brand-ink",
};

function KindTag({ kind }: { kind: string }) {
  const style = KIND_STYLES[kind] ?? "bg-brand-cream text-brand-ink";
  return (
    <span
      className={`shrink-0 rounded-md border-[2px] border-brand-ink px-2 py-0.5 font-display text-xs uppercase tracking-wide ${style}`}
    >
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
    <form action={action} className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <ComicButton variant="lime" type="submit" disabled={pending}>
        {pending ? "Drafting…" : "Generate drafts now"}
      </ComicButton>
      <span className="text-sm text-brand-ink/60">
        Pulls in community activity + dev news (HN, Dev.to, Reddit).
      </span>
      {state.error && (
        <span className="text-sm text-brand-purple">{state.error}</span>
      )}
      {state.ok && (
        <span className="text-sm text-brand-ink/60">Drafts added below.</span>
      )}
    </form>
  );
}

/** Convert a stored UTC ISO string to the local "YYYY-MM-DDTHH:mm" the picker wants. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** One lean row: kind label, optional schedule chip, the text, a Configure button. */
function TweetRowItem({
  tweet,
  onConfigure,
}: {
  tweet: TweetRow;
  onConfigure: (t: TweetRow) => void;
}) {
  const scheduled = tweet.status === "scheduled";
  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-comic)] border-ink bg-surface px-3 py-2 shadow-comic-sm">
      <KindTag kind={tweet.kind} />
      {scheduled && (
        <span
          suppressHydrationWarning
          className="shrink-0 rounded-md border-[2px] border-brand-ink bg-brand-blue px-2 py-0.5 font-mono text-[11px] text-white"
        >
          {tweet.scheduled_for
            ? new Date(tweet.scheduled_for).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : "scheduled"}
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm text-brand-ink/85">
        {tweet.body}
      </p>
      <button
        type="button"
        onClick={() => onConfigure(tweet)}
        className="focus-comic shrink-0 rounded-md border-ink bg-white px-3 py-1 font-display text-xs uppercase tracking-wide text-brand-ink shadow-comic-sm transition-transform hover:-translate-y-0.5"
      >
        Configure
      </button>
    </li>
  );
}

function ConfigureModal({
  tweet,
  onClose,
}: {
  tweet: TweetRow;
  onClose: () => void;
}) {
  const [body, setBody] = useState(tweet.body);
  const [schedLocal, setSchedLocal] = useState(toLocalInput(tweet.scheduled_for));
  const [deleting, startDelete] = useTransition();

  const [postState, postAction, posting] = useActionState<
    TweetActionState,
    FormData
  >(approveAndPost, {});
  const [schedState, schedAction, scheduling] = useActionState<
    TweetActionState,
    FormData
  >(scheduleTweet, {});

  const len = tweetLength(body);
  const over = len > TWEET_MAX;
  const empty = body.trim().length === 0;

  // Close once an action lands — the page revalidates and the list refreshes.
  useEffect(() => {
    if (postState.ok || schedState.ok) onClose();
  }, [postState.ok, schedState.ok, onClose]);

  // Esc to dismiss.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onDelete() {
    startDelete(async () => {
      const fd = new FormData();
      fd.set("id", tweet.id);
      await rejectTweet(fd);
      onClose();
    });
  }

  const busy = posting || scheduling || deleting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configure tweet"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[var(--radius-comic)] border-ink bg-brand-cream p-5 shadow-comic"
      >
        <div className="flex items-center gap-2">
          <KindTag kind={tweet.kind} />
          <span className="font-mono text-xs uppercase tracking-widest text-brand-ink/50">
            for {tweet.created_for}
          </span>
          <span
            className={`ml-auto font-mono text-xs ${over ? "text-brand-purple" : "text-brand-ink/55"}`}
          >
            {len}/{TWEET_MAX}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="focus-comic ml-1 flex h-7 w-7 items-center justify-center rounded-md border-ink bg-white text-brand-ink shadow-comic-sm hover:bg-white/70"
          >
            ✕
          </button>
        </div>

        {tweet.rationale && (
          <p className="mt-3 text-xs italic text-brand-ink/55">
            {tweet.rationale}
          </p>
        )}

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="mt-3 w-full resize-y rounded-[var(--radius-comic)] border-ink bg-white px-3 py-2 text-brand-ink outline-none focus:shadow-comic-sm"
        />

        <div className="mt-4">
          <p className="font-display text-xs uppercase tracking-wide text-brand-ink/50">
            Schedule for
          </p>
          <div className="mt-2">
            <ComicDateTimePicker
              name="_sched"
              defaultValue={toLocalInput(tweet.scheduled_for)}
              onChange={setSchedLocal}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t-2 border-brand-ink/10 pt-4">
          <form action={postAction}>
            <input type="hidden" name="id" value={tweet.id} />
            <input type="hidden" name="source_url" value={tweet.source_url ?? ""} />
            <input type="hidden" name="body" value={body} />
            <ComicButton
              variant="blue"
              type="submit"
              disabled={busy || over || empty}
            >
              {posting ? "Posting…" : "Post now"}
            </ComicButton>
          </form>

          <form action={schedAction}>
            <input type="hidden" name="id" value={tweet.id} />
            <input type="hidden" name="source_url" value={tweet.source_url ?? ""} />
            <input type="hidden" name="body" value={body} />
            <input
              type="hidden"
              name="scheduled_for"
              value={schedLocal ? new Date(schedLocal).toISOString() : ""}
            />
            <button
              type="submit"
              disabled={busy || over || empty || !schedLocal}
              className="focus-comic rounded-md border-ink bg-surface px-4 py-2 font-display text-sm uppercase tracking-wide text-brand-ink shadow-comic-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {scheduling
                ? "Scheduling…"
                : tweet.status === "scheduled"
                  ? "Reschedule"
                  : "Schedule"}
            </button>
          </form>

          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="focus-comic ml-auto text-xs uppercase tracking-wide text-brand-ink/50 hover:text-brand-purple disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>

        {(postState.error || schedState.error) && (
          <p className="mt-3 text-sm text-brand-purple">
            {postState.error || schedState.error}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The whole queue: one lean, flat list of draft + scheduled tweets, each with a
 * Configure button that opens the editor/scheduler modal.
 */
export function TweetConsole({
  drafts,
  scheduled,
}: {
  drafts: TweetRow[];
  scheduled: TweetRow[];
}) {
  const [active, setActive] = useState<TweetRow | null>(null);
  // Scheduled first (time-sensitive), then drafts.
  const rows = [...scheduled, ...drafts];

  if (rows.length === 0) {
    return (
      <p className="mt-6 text-brand-ink/70">
        No tweets waiting. Use “Generate drafts now” or wait for the daily run.
      </p>
    );
  }

  return (
    <>
      <ul className="mt-6 flex flex-col gap-2">
        {rows.map((t) => (
          <TweetRowItem key={t.id} tweet={t} onConfigure={setActive} />
        ))}
      </ul>
      {active && (
        <ConfigureModal
          key={active.id}
          tweet={active}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}
