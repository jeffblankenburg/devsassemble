"use client";

import { useEffect, useState } from "react";
import { slugify } from "@/lib/forum/slug";

const inputClass =
  "rounded-[var(--radius-comic)] border-ink bg-white px-4 py-3 text-brand-ink outline-none focus:shadow-comic-sm";
const labelClass =
  "font-display text-lg uppercase tracking-wide text-brand-ink";

type Status = "idle" | "checking" | "available" | "taken" | "error";

/**
 * Title + slug pair. The slug auto-fills from the title until the user edits it,
 * then stops syncing. Availability is checked live against the events API.
 */
export function TitleSlugFields({
  defaultTitle = "",
  defaultSlug = "",
  excludeId,
}: {
  defaultTitle?: string;
  defaultSlug?: string;
  excludeId?: string;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [slug, setSlug] = useState(defaultSlug);
  const [slugEdited, setSlugEdited] = useState(Boolean(defaultSlug));
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!slug) {
        setStatus("idle");
        return;
      }
      setStatus("checking");
      try {
        const params = new URLSearchParams({ slug });
        if (excludeId) params.set("exclude", excludeId);
        const res = await fetch(`/api/events/slug-available?${params}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { available: boolean | null };
        setStatus(
          data.available === true
            ? "available"
            : data.available === false
              ? "taken"
              : "error",
        );
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [slug, excludeId]);

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className={labelClass}>Title</span>
        <input
          name="title"
          required
          value={title}
          onChange={(e) => {
            const v = e.target.value;
            setTitle(v);
            if (!slugEdited) setSlug(slugify(v));
          }}
          placeholder="Ship-it Thursday: agents in production"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Slug</span>
        <input
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value));
            setSlugEdited(true);
          }}
          placeholder="ship-it-thursday"
          className={inputClass}
        />
        <span className="text-xs text-brand-ink/55">
          Permanent URL: <span className="font-mono">/events/{slug || "…"}</span>
          {status === "checking" && " · checking…"}
          {status === "available" && (
            <span className="text-brand-lime-ink"> · ✓ available</span>
          )}
          {status === "taken" && (
            <span className="text-brand-purple"> · ✗ already taken</span>
          )}
        </span>
      </div>
    </>
  );
}
