"use client";

import { useActionState } from "react";
import Image from "next/image";
import {
  generateHeroAvatar,
  uploadBasePhoto,
  useGithubAvatar,
  setAvatarPreference,
  type AvatarState,
} from "@/lib/avatar/actions";
import { ComicButton } from "@/components/brand/comic-button";

function Avatar({ src, label }: { src: string | null; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {src ? (
        <Image
          src={src}
          alt={label}
          width={88}
          height={88}
          className="h-[88px] w-[88px] rounded-full border-ink object-cover shadow-comic"
        />
      ) : (
        <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full border-ink bg-brand-cream font-mono text-[10px] text-brand-ink/60 shadow-comic">
          none
        </span>
      )}
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </span>
    </div>
  );
}

const btn =
  "focus-comic rounded-md border-ink px-4 py-2 font-display text-sm uppercase shadow-comic-sm";

export function AvatarStudio({
  baseAvatar,
  heroAvatar,
  preference,
  hasGithub,
  canGenerate,
  nextAvailableLabel,
  heroEnabled,
}: {
  baseAvatar: string | null;
  heroAvatar: string | null;
  preference: "base" | "hero";
  hasGithub: boolean;
  canGenerate: boolean;
  nextAvailableLabel: string | null;
  heroEnabled: boolean;
}) {
  const [uploadState, uploadAction, uploading] = useActionState<
    AvatarState,
    FormData
  >(uploadBasePhoto, {});
  const [genState, genAction, generating] = useActionState<
    AvatarState,
    FormData
  >(generateHeroAvatar, {});

  return (
    <div className="rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
      <h2 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
        Your avatar
      </h2>
      <p className="mt-1 text-sm text-brand-ink/70">
        Pick your photo, optionally turn it into a superhero, and choose which
        one the community sees.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-6">
        <Avatar
          src={baseAvatar}
          label={preference === "base" ? "Normal · live" : "Normal"}
        />
        <Avatar
          src={heroAvatar}
          label={preference === "hero" ? "Hero · live" : "Hero"}
        />
      </div>

      {heroAvatar && (
        <a
          href={`${heroAvatar}?download=devsassemble-hero.png`}
          className="focus-comic mt-4 inline-flex w-fit items-center gap-2 rounded-md border-ink bg-brand-lime px-4 py-2 font-display text-sm uppercase text-brand-ink shadow-comic-sm transition-transform hover:-translate-y-0.5"
        >
          ⬇ Download full-size hero
        </a>
      )}

      {/* Source */}
      <div className="mt-6">
        <h3 className="font-display text-lg uppercase tracking-wide text-brand-ink">
          Your photo
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {hasGithub && (
            <form action={useGithubAvatar}>
              <button
                type="submit"
                className={`${btn} bg-surface text-brand-ink hover:bg-brand-lime`}
              >
                Use GitHub photo
              </button>
            </form>
          )}
          <form action={uploadAction} className="flex items-center gap-2">
            <input
              type="file"
              name="photo"
              accept="image/*"
              required
              className="rounded-[var(--radius-comic)] border-ink bg-white px-3 py-2 text-sm text-brand-ink outline-none"
            />
            <ComicButton variant="ink" type="submit" disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </ComicButton>
          </form>
        </div>
        {uploadState.error && (
          <p className="mt-2 text-sm text-brand-purple">{uploadState.error}</p>
        )}
      </div>

      {/* Hero generation */}
      {heroEnabled && (
        <div className="mt-6 border-t-2 border-brand-ink/10 pt-5">
          <h3 className="font-display text-lg uppercase tracking-wide text-brand-ink">
            Become a superhero
          </h3>
          <p className="mt-1 text-sm text-brand-ink/70">
            Turn your photo into a comic-book superhero — DevsAssemble style.
            Once per week.
          </p>
          <form action={genAction} className="mt-3 flex flex-col gap-3">
            <label className="flex items-start gap-2 text-sm text-brand-ink/80">
              <input
                type="checkbox"
                name="consent"
                required
                className="mt-0.5 h-4 w-4 rounded border-ink"
              />
              <span>
                I understand my photo will be sent to Google&apos;s Gemini to
                generate a stylized version.
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <ComicButton
                variant="purple"
                type="submit"
                disabled={generating || !canGenerate}
              >
                {generating ? "Summoning your hero…" : "Generate my hero"}
              </ComicButton>
              {!canGenerate && nextAvailableLabel && (
                <span className="font-mono text-xs uppercase tracking-widest text-muted">
                  Next: {nextAvailableLabel}
                </span>
              )}
              {genState.error && (
                <span className="text-sm text-brand-purple">
                  {genState.error}
                </span>
              )}
              {genState.ok && (
                <span className="font-display text-lg uppercase text-brand-lime-ink">
                  Hero created! ✓
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Display toggle */}
      {heroAvatar && (
        <div className="mt-6 border-t-2 border-brand-ink/10 pt-5">
          <h3 className="font-display text-lg uppercase tracking-wide text-brand-ink">
            Show the community
          </h3>
          <div className="mt-2 flex gap-2">
            {(["base", "hero"] as const).map((pref) => (
              <form key={pref} action={setAvatarPreference}>
                <input type="hidden" name="preference" value={pref} />
                <button
                  type="submit"
                  aria-pressed={preference === pref}
                  className={`${btn} ${
                    preference === pref
                      ? "bg-brand-blue text-white"
                      : "bg-surface text-brand-ink hover:bg-brand-lime"
                  }`}
                >
                  {pref === "base" ? "Normal" : "Superhero"}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
