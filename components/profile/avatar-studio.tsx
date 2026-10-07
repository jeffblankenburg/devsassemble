"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import {
  generateHeroAvatar,
  uploadBasePhoto,
  useGithubAvatar,
  setAvatarPreference,
  setActiveHero,
  type AvatarState,
} from "@/lib/avatar/actions";
import { ComicButton } from "@/components/brand/comic-button";

/** A top avatar that doubles as the "show the community" selector. */
function SelectableAvatar({
  src,
  label,
  pref,
  active,
  selectable,
}: {
  src: string | null;
  label: string;
  pref: "base" | "hero";
  active: boolean;
  selectable: boolean;
}) {
  const img = (
    <span className="relative">
      {src ? (
        <Image
          src={src}
          alt={label}
          width={88}
          height={88}
          className={`h-[88px] w-[88px] rounded-full border-ink object-cover shadow-comic ${
            active ? "ring-2 ring-brand-blue ring-offset-2" : ""
          }`}
        />
      ) : (
        <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full border-ink bg-brand-cream font-mono text-[10px] text-brand-ink/60 shadow-comic">
          none
        </span>
      )}
      {active && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-ink bg-brand-blue text-sm font-bold text-white shadow-comic-sm"
        >
          ✓
        </span>
      )}
    </span>
  );

  const caption = (
    <span
      className={`font-mono text-[10px] uppercase tracking-widest ${
        active ? "font-bold text-brand-blue" : "text-muted"
      }`}
    >
      {label}
    </span>
  );

  if (!selectable) {
    return (
      <div className="flex flex-col items-center gap-1 opacity-60">
        {img}
        {caption}
      </div>
    );
  }

  return (
    <form action={setAvatarPreference}>
      <input type="hidden" name="preference" value={pref} />
      <button
        type="submit"
        aria-pressed={active}
        title={active ? `${label} is shown to the community` : `Show ${label} to the community`}
        className="focus-comic flex flex-col items-center gap-1 rounded-md transition-transform hover:-translate-y-0.5"
      >
        {img}
        {caption}
      </button>
    </form>
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
  heroGallery,
}: {
  baseAvatar: string | null;
  heroAvatar: string | null;
  preference: "base" | "hero";
  hasGithub: boolean;
  canGenerate: boolean;
  nextAvailableLabel: string | null;
  heroEnabled: boolean;
  heroGallery: string[];
}) {
  const [uploadState, uploadAction, uploading] = useActionState<
    AvatarState,
    FormData
  >(uploadBasePhoto, {});
  const [genState, genAction, generating] = useActionState<
    AvatarState,
    FormData
  >(generateHeroAvatar, {});
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div className="rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
      <h2 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
        Your avatar
      </h2>
      <p className="mt-1 text-sm text-brand-ink/70">
        Pick your photo, optionally turn it into a superhero, and tap the one
        you want the community to see.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-6">
        <SelectableAvatar
          src={baseAvatar}
          label="Normal"
          pref="base"
          active={preference === "base"}
          selectable={Boolean(baseAvatar)}
        />
        <SelectableAvatar
          src={heroAvatar}
          label="Hero"
          pref="hero"
          active={preference === "hero"}
          selectable={Boolean(heroAvatar)}
        />
      </div>

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

      {/* Hero gallery — shown above generation once you've made one */}
      {heroGallery.length > 0 && (
        <div className="mt-6 border-t-2 border-brand-ink/10 pt-5">
          <h3 className="font-display text-lg uppercase tracking-wide text-brand-ink">
            Your heroes
          </h3>
          <p className="mt-1 text-sm text-brand-ink/70">
            Every hero you&apos;ve made — tap to see it full size, or set any as
            your avatar.
          </p>
          <ul className="mt-3 flex flex-wrap gap-4">
            {heroGallery.map((url) => (
              <li key={url} className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLightbox(url)}
                  aria-label="View full size"
                  className="focus-comic rounded-md transition-transform hover:-translate-y-0.5"
                >
                  <Image
                    src={url}
                    alt="Past hero"
                    width={80}
                    height={80}
                    className={`h-20 w-20 rounded-md border-ink object-cover shadow-comic-sm ${
                      url === heroAvatar
                        ? "ring-2 ring-brand-blue ring-offset-2"
                        : ""
                    }`}
                  />
                </button>
                <form action={setActiveHero}>
                  <input type="hidden" name="url" value={url} />
                  <button
                    type="submit"
                    className="focus-comic rounded-md border-[2px] border-brand-ink bg-surface px-2 py-0.5 font-mono text-[10px] uppercase text-brand-ink hover:bg-brand-lime"
                  >
                    {url === heroAvatar ? "Active" : "Use"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hero generation */}
      {heroEnabled && (
        <div className="mt-6 border-t-2 border-brand-ink/10 pt-5">
          <h3 className="font-display text-lg uppercase tracking-wide text-brand-ink">
            Become a superhero
          </h3>
          <p className="mt-1 text-sm text-brand-ink/70">
            Turn your photo into a comic-book superhero — DevsAssemble style.
            Once per week. For the best likeness, use a clear, front-facing,
            well-lit photo.
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

      {/* Full-screen hero viewer */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Hero preview"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/80 p-6 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="focus-comic absolute right-5 top-5 rounded-md border-ink bg-surface px-3 py-1 font-display text-sm uppercase text-brand-ink shadow-comic-sm"
          >
            Close ✕
          </button>
          <Image
            src={lightbox}
            alt="Hero full size"
            width={768}
            height={768}
            onClick={(e) => e.stopPropagation()}
            className="h-auto max-h-[85vh] w-auto max-w-full rounded-[var(--radius-comic)] border-ink object-contain shadow-comic"
          />
        </div>
      )}
    </div>
  );
}
