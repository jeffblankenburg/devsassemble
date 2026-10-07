"use client";

import { useActionState } from "react";
import Image from "next/image";
import {
  generateHeroAvatar,
  type HeroAvatarState,
} from "@/lib/avatar/actions";
import { ComicButton } from "@/components/brand/comic-button";

export function HeroAvatarGenerator({
  currentAvatar,
}: {
  currentAvatar: string | null;
}) {
  const [state, action, pending] = useActionState<HeroAvatarState, FormData>(
    generateHeroAvatar,
    {},
  );

  const preview = state.avatarUrl ?? currentAvatar;

  return (
    <div className="rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
      <h2 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
        Become a superhero
      </h2>
      <p className="mt-1 text-sm text-brand-ink/70">
        Turn your avatar into a comic-book superhero portrait — your new profile
        picture, DevsAssemble style.
      </p>

      <div className="mt-4 flex items-center gap-4">
        {preview ? (
          <Image
            src={preview}
            alt="Avatar preview"
            width={96}
            height={96}
            className="h-24 w-24 rounded-full border-ink object-cover shadow-comic"
          />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-full border-ink bg-brand-cream font-mono text-xs text-brand-ink/60 shadow-comic">
            no photo
          </span>
        )}
        {state.ok && (
          <span className="font-display text-lg uppercase text-brand-lime-ink">
            Your hero is live! ✓
          </span>
        )}
      </div>

      <form action={action} className="mt-5 flex flex-col gap-3">
        <label className="flex items-start gap-2 text-sm text-brand-ink/80">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 h-4 w-4 rounded border-ink"
          />
          <span>
            I understand my current avatar will be sent to Google&apos;s Gemini
            to generate a stylized version, and it will replace my profile
            picture.
          </span>
        </label>

        <div className="flex items-center gap-4">
          <ComicButton variant="purple" type="submit" disabled={pending}>
            {pending ? "Summoning your hero…" : "Generate my hero"}
          </ComicButton>
          {state.error && (
            <span className="text-sm text-brand-purple">{state.error}</span>
          )}
        </div>
      </form>

      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted">
        You can re-generate anytime, or edit your photo below.
      </p>
    </div>
  );
}
