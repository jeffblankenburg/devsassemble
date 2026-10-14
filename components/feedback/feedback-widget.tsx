"use client";

import { useEffect, useState, useTransition } from "react";
import { submitFeedback } from "@/lib/feedback/actions";
import { ComicButton } from "@/components/brand/comic-button";

const CATEGORIES = [
  { value: "idea", label: "Idea" },
  { value: "bug", label: "Bug" },
  { value: "question", label: "Question" },
  { value: "other", label: "Other" },
];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("idea");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function reset() {
    setMessage("");
    setEmail("");
    setCategory("idea");
    setDone(false);
    setError(null);
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await submitFeedback({
        category,
        message,
        email,
        pageUrl:
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "",
      });
      if (res?.error) setError(res.error);
      else setDone(true);
    });
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(true);
          }}
          className="focus-comic fixed bottom-5 right-5 z-40 rounded-full border-ink bg-brand-blue px-4 py-2.5 font-display text-sm uppercase tracking-wide text-white shadow-comic transition-transform hover:-translate-y-0.5"
          aria-label="Send feedback"
        >
          💬 Feedback
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-end"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Send feedback"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[var(--radius-comic)] border-ink bg-brand-cream p-5 shadow-comic"
          >
            {done ? (
              <div className="flex flex-col gap-3">
                <h2 className="font-display text-xl uppercase tracking-wide text-brand-ink">
                  Thanks! 🙌
                </h2>
                <p className="text-sm text-brand-ink/75">
                  We got it — the team will take a look.
                </p>
                <ComicButton
                  variant="blue"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Done
                </ComicButton>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl uppercase tracking-wide text-brand-ink">
                    Feedback
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="focus-comic ml-auto flex h-7 w-7 items-center justify-center rounded-md border-ink bg-white text-brand-ink shadow-comic-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      aria-pressed={category === c.value}
                      className={`focus-comic rounded-md border-[2px] border-brand-ink px-2.5 py-1 font-display text-xs uppercase tracking-wide shadow-comic-sm ${
                        category === c.value
                          ? "bg-brand-blue text-white"
                          : "bg-white text-brand-ink"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  autoFocus
                  placeholder="What's on your mind? Bugs, ideas, anything."
                  className="mt-3 w-full resize-y rounded-[var(--radius-comic)] border-ink bg-white px-3 py-2 text-brand-ink outline-none placeholder:text-brand-ink/40 focus:shadow-comic-sm"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional — if you'd like a reply)"
                  className="mt-2 w-full rounded-[var(--radius-comic)] border-ink bg-white px-3 py-2 text-sm text-brand-ink outline-none placeholder:text-brand-ink/40 focus:shadow-comic-sm"
                />

                <div className="mt-3 flex items-center gap-3">
                  <ComicButton
                    variant="lime"
                    type="button"
                    onClick={submit}
                    disabled={pending || message.trim().length < 3}
                  >
                    {pending ? "Sending…" : "Send"}
                  </ComicButton>
                  {error && (
                    <span className="text-sm text-brand-purple">{error}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
