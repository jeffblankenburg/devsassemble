"use client";

import { useActionState } from "react";
import {
  updateProfile,
  type ProfileState,
} from "@/lib/profile/actions";
import { ComicButton } from "@/components/brand/comic-button";

type ProfileValues = {
  display_name: string | null;
  bio: string | null;
  website_url: string | null;
  x_url: string | null;
  linkedin_url: string | null;
};

const FIELDS: {
  name: keyof ProfileValues;
  label: string;
  type?: string;
  placeholder?: string;
}[] = [
  { name: "display_name", label: "Display name", placeholder: "Ada Lovelace" },
  { name: "website_url", label: "Website", type: "url", placeholder: "https://…" },
  { name: "x_url", label: "X / Twitter", type: "url", placeholder: "https://x.com/…" },
  { name: "linkedin_url", label: "LinkedIn", type: "url", placeholder: "https://linkedin.com/in/…" },
];

export function ProfileForm({ profile }: { profile: ProfileValues }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {FIELDS.map((f) => (
        <div key={f.name} className="flex flex-col gap-1">
          <label
            htmlFor={f.name}
            className="font-display text-lg uppercase tracking-wide text-brand-ink"
          >
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type ?? "text"}
            defaultValue={profile[f.name] ?? ""}
            placeholder={f.placeholder}
            className="rounded-[var(--radius-comic)] border-ink bg-white px-4 py-3 text-brand-ink outline-none focus:shadow-comic-sm"
          />
        </div>
      ))}

      <div className="flex flex-col gap-1">
        <label
          htmlFor="bio"
          className="font-display text-lg uppercase tracking-wide text-brand-ink"
        >
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={280}
          defaultValue={profile.bio ?? ""}
          placeholder="What are you building?"
          className="rounded-[var(--radius-comic)] border-ink bg-white px-4 py-3 text-brand-ink outline-none focus:shadow-comic-sm"
        />
      </div>

      <div className="flex items-center gap-4">
        <ComicButton variant="blue" type="submit">
          {pending ? "Saving…" : "Save profile"}
        </ComicButton>
        {state.ok && state.message && (
          <span className="font-display text-lg uppercase text-brand-lime-ink">
            {state.message}
          </span>
        )}
        {state.error && (
          <span className="text-sm text-brand-purple">{state.error}</span>
        )}
      </div>
    </form>
  );
}
