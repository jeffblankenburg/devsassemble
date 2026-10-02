"use client";

import { useActionState } from "react";
import { signInWithOtp, signInWithGithub, type AuthState } from "@/lib/auth/actions";
import { ComicButton } from "@/components/brand/comic-button";

const initialState: AuthState = {};

export function LoginForm({
  initialError,
  next,
}: {
  initialError?: string;
  next?: string;
}) {
  const [state, action, pending] = useActionState(signInWithOtp, initialState);

  return (
    <div className="w-full max-w-md rounded-[var(--radius-comic)] border-ink bg-surface p-8 shadow-comic-lg">
      <h1 className="font-display text-4xl uppercase tracking-wide text-brand-ink">
        Assemble
      </h1>
      <p className="mt-1 text-brand-ink/70">
        Sign in to show your builds and join the meetups.
      </p>

      {/* GitHub OAuth */}
      <form action={signInWithGithub} className="mt-6">
        {next && <input type="hidden" name="next" value={next} />}
        <ComicButton variant="ink" type="submit" className="w-full">
          Continue with GitHub
        </ComicButton>
      </form>

      <div className="my-6 flex items-center gap-3 text-sm text-brand-ink/50">
        <span className="h-[2px] flex-1 bg-brand-ink/15" />
        or with email
        <span className="h-[2px] flex-1 bg-brand-ink/15" />
      </div>

      {/* Email OTP / magic link */}
      <form action={action} className="flex flex-col gap-3">
        {next && <input type="hidden" name="next" value={next} />}
        <label htmlFor="email" className="font-display text-lg uppercase tracking-wide">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="rounded-[var(--radius-comic)] border-ink bg-white px-4 py-3 text-brand-ink outline-none focus:shadow-comic-sm"
        />
        <ComicButton variant="blue" type="submit" className="w-full">
          {pending ? "Sending…" : "Send me a link"}
        </ComicButton>
      </form>

      {state.ok && state.message && (
        <p className="mt-4 rounded-md border-ink bg-brand-lime px-3 py-2 text-sm text-brand-ink">
          {state.message}
        </p>
      )}
      {(state.error || initialError) && (
        <p className="mt-4 rounded-md border-ink bg-brand-purple px-3 py-2 text-sm text-white">
          {state.error ?? initialError}
        </p>
      )}
    </div>
  );
}
