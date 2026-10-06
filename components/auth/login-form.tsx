import { signInWithGithub } from "@/lib/auth/actions";
import { ComicButton } from "@/components/brand/comic-button";

/** GitHub-only sign-in. GitHub OAuth is the single auth method (anti-spam). */
export function LoginForm({
  initialError,
  next,
}: {
  initialError?: string;
  next?: string;
}) {
  return (
    <div className="w-full max-w-md rounded-[var(--radius-comic)] border-ink bg-surface p-8 shadow-comic-lg">
      <h1 className="font-display text-4xl uppercase tracking-wide text-brand-ink">
        Assemble
      </h1>
      <p className="mt-1 text-brand-ink/70">
        Sign in with GitHub to show your builds and join the meetups.
      </p>

      <form action={signInWithGithub} className="mt-6">
        {next && <input type="hidden" name="next" value={next} />}
        <ComicButton variant="ink" type="submit" className="w-full">
          Continue with GitHub
        </ComicButton>
      </form>

      {initialError && (
        <p className="mt-4 rounded-md border-ink bg-brand-purple px-3 py-2 text-sm text-white">
          {initialError}
        </p>
      )}
    </div>
  );
}
