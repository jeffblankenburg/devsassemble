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
    <form action={action} className="flex items-center gap-3">
      {state.error && (
        <span className="text-sm text-brand-purple">{state.error}</span>
      )}
      <ComicButton variant="lime" type="submit" disabled={pending}>
        {pending ? "Drafting…" : "Generate drafts now"}
      </ComicButton>
    </form>
  );
}

/** Render a stored UTC timestamp as the admin's local date + time. */
export function PostedAt({ iso }: { iso: string | null }) {
  if (!iso) return null;
  return (
    <span suppressHydrationWarning className="font-mono text-xs text-brand-ink/50">
      {new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}
    </span>
  );
}

/** Convert a stored UTC ISO string to the local "YYYY-MM-DDTHH:mm" the picker wants. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** One lean row: kind label, optional schedule chip, text, Configure + Delete. */
function TweetRowItem({
  tweet,
  onConfigure,
}: {
  tweet: TweetRow;
  onConfigure: (t: TweetRow) => void;
}) {
  const [deleting, startDelete] = useTransition();
  const scheduled = tweet.status === "scheduled";

  function onDelete() {
    startDelete(async () => {
      const fd = new FormData();
      fd.set("id", tweet.id);
      await rejectTweet(fd);
    });
  }

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
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label="Delete tweet"
        title="Delete"
        className="focus-comic shrink-0 rounded-md border-ink bg-white px-2 py-1 text-brand-ink/60 shadow-comic-sm transition-transform hover:-translate-y-0.5 hover:text-brand-purple disabled:opacity-50"
      >
        {deleting ? "…" : "✕"}
      </button>
    </li>
  );
}

// Quick relative-schedule steps, anchored to the latest scheduled tweet.
const QUICK_STEPS = [
  { label: "1h", hours: 1 },
  { label: "3h", hours: 3 },
  { label: "1 day", hours: 24 },
];

const COMPOSE_KINDS = [
  "news",
  "event",
  "project",
  "tool",
  "discussion",
  "evergreen",
];

function ConfigureModal({
  tweet,
  latestScheduledMs,
  onClose,
}: {
  tweet: TweetRow | null; // null → compose a brand-new tweet
  latestScheduledMs: number | null;
  onClose: () => void;
}) {
  const compose = tweet === null;
  const id = tweet?.id ?? "";
  const sourceUrl = tweet?.source_url ?? "";

  const [body, setBody] = useState(tweet?.body ?? "");
  const [kind, setKind] = useState(tweet?.kind ?? "evergreen");
  const [schedLocal, setSchedLocal] = useState(
    toLocalInput(tweet?.scheduled_for ?? null),
  );
  const [quickError, setQuickError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [quickScheduling, startQuick] = useTransition();

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

  // "Now" captured once when the modal opens (Date.now() can't run during render).
  const [openedAtMs] = useState(() => Date.now());
  const hasLatest = (latestScheduledMs ?? 0) > openedAtMs;

  function scheduleAt(when: Date) {
    setQuickError(null);
    startQuick(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("kind", kind);
      fd.set("source_url", sourceUrl);
      fd.set("body", body);
      fd.set("scheduled_for", when.toISOString());
      const res = await scheduleTweet({}, fd);
      if (res.ok) onClose();
      else setQuickError(res.error ?? "Could not schedule.");
    });
  }

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
      fd.set("id", id);
      await rejectTweet(fd);
      onClose();
    });
  }

  const busy = posting || scheduling || deleting || quickScheduling;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 p-4"
      // Close only on a genuine backdrop click. Using the target===currentTarget
      // check (not stopPropagation) keeps the modal open when an inner element
      // unmounts mid-click — e.g. picking a day collapses the calendar.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={compose ? "Write a tweet" : "Configure tweet"}
        className="w-full max-w-lg rounded-[var(--radius-comic)] border-ink bg-brand-cream p-5 shadow-comic"
      >
        <div className="flex items-center gap-2">
          {compose ? (
            <span className="font-display text-lg uppercase tracking-wide text-brand-ink">
              Write a tweet
            </span>
          ) : (
            <>
              <KindTag kind={kind} />
              {tweet && (
                <span className="font-mono text-xs uppercase tracking-widest text-brand-ink/50">
                  for {tweet.created_for}
                </span>
              )}
            </>
          )}
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

        {compose && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {COMPOSE_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`focus-comic rounded-md border-[2px] border-brand-ink px-2 py-0.5 font-display text-xs uppercase tracking-wide shadow-comic-sm ${
                  kind === k
                    ? (KIND_STYLES[k] ?? "bg-brand-cream text-brand-ink")
                    : "bg-white text-brand-ink/60"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        )}

        {tweet?.rationale && (
          <p className="mt-3 text-xs italic text-brand-ink/55">
            {tweet.rationale}
          </p>
        )}

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          autoFocus={compose}
          placeholder={
            compose ? "What do you want to say? Links go right in the text." : undefined
          }
          className="mt-3 w-full resize-y rounded-[var(--radius-comic)] border-ink bg-white px-3 py-2 text-brand-ink outline-none placeholder:text-brand-ink/40 focus:shadow-comic-sm"
        />

        <div className="mt-4">
          <p className="font-display text-xs uppercase tracking-wide text-brand-ink/50">
            Schedule
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-brand-ink/60">
              {hasLatest ? "After the last scheduled one:" : "From now:"}
            </span>
            {QUICK_STEPS.map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={busy || over || empty}
                onClick={() =>
                  scheduleAt(
                    new Date(
                      Math.max(latestScheduledMs ?? 0, Date.now()) +
                        s.hours * 3_600_000,
                    ),
                  )
                }
                className="focus-comic rounded-md border-[2px] border-brand-ink bg-white px-3 py-1 font-display text-xs uppercase tracking-wide text-brand-ink shadow-comic-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                +{s.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-brand-ink/50">…or pick an exact time:</p>
          <div className="mt-1">
            <ComicDateTimePicker
              name="_sched"
              defaultValue={toLocalInput(tweet?.scheduled_for ?? null)}
              onChange={setSchedLocal}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t-2 border-brand-ink/10 pt-4">
          <form action={postAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="source_url" value={sourceUrl} />
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
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="source_url" value={sourceUrl} />
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
                : tweet?.status === "scheduled"
                  ? "Reschedule"
                  : "Schedule"}
            </button>
          </form>

          {!compose && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="focus-comic ml-auto text-xs uppercase tracking-wide text-brand-ink/50 hover:text-brand-purple disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>

        {(postState.error || schedState.error || quickError) && (
          <p className="mt-3 text-sm text-brand-purple">
            {postState.error || schedState.error || quickError}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Two sections: Drafts (on top, with the composer) and Queue (scheduled, below).
 * Every row has a Configure button that opens the editor/scheduler modal.
 */
export function TweetConsole({
  drafts,
  scheduled,
}: {
  drafts: TweetRow[];
  scheduled: TweetRow[];
}) {
  // A TweetRow opens Configure; the "new" sentinel opens the blank composer.
  const [active, setActive] = useState<TweetRow | "new" | null>(null);
  // Latest future schedule time — the anchor for "+1h / +3h after the last one".
  const latestScheduledMs =
    scheduled.reduce((max, t) => {
      const ms = t.scheduled_for ? new Date(t.scheduled_for).getTime() : 0;
      return ms > max ? ms : max;
    }, 0) || null;

  return (
    <>
      {/* Drafts */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
          Drafts
        </h2>
        <button
          type="button"
          onClick={() => setActive("new")}
          className="focus-comic rounded-md border-ink bg-brand-purple px-3 py-1.5 font-display text-xs uppercase tracking-wide text-white shadow-comic-sm transition-transform hover:-translate-y-0.5"
        >
          ✍ Write a tweet
        </button>
      </div>
      {drafts.length === 0 ? (
        <p className="mt-4 text-sm text-brand-ink/55">No drafts right now.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {drafts.map((t) => (
            <TweetRowItem key={t.id} tweet={t} onConfigure={setActive} />
          ))}
        </ul>
      )}

      {/* Queue (scheduled) */}
      {scheduled.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-2xl uppercase tracking-wide text-brand-ink">
            Queue
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {scheduled.map((t) => (
              <TweetRowItem key={t.id} tweet={t} onConfigure={setActive} />
            ))}
          </ul>
        </>
      )}

      {active && (
        <ConfigureModal
          key={active === "new" ? "__new__" : active.id}
          tweet={active === "new" ? null : active}
          latestScheduledMs={latestScheduledMs}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}
