"use client";

import { useState, useTransition } from "react";
import { saveHandle, deleteHandle } from "@/lib/social/admin-actions";
import { ComicButton } from "@/components/brand/comic-button";
import type { SocialHandle } from "@/lib/social/handles";

const field =
  "rounded-md border-[2px] border-brand-ink bg-white px-2 py-1 text-sm text-brand-ink outline-none focus:shadow-comic-sm";

function ProfileLink({
  kind,
  handle,
}: {
  kind: "x" | "bsky";
  handle: string;
}) {
  const clean = handle.trim().replace(/^@+/, "");
  if (!clean) return null;
  const href =
    kind === "x"
      ? `https://x.com/${clean}`
      : `https://bsky.app/profile/${clean}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-comic font-mono text-xs text-brand-blue underline"
    >
      open ↗
    </a>
  );
}

function HandleRow({ h }: { h: SocialHandle }) {
  const [x, setX] = useState(h.x_handle ?? "");
  const [bsky, setBsky] = useState(h.bluesky_handle ?? "");
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  function save() {
    startSave(async () => {
      const fd = new FormData();
      fd.set("id", h.id);
      fd.set("name", h.name);
      fd.set("x_handle", x);
      fd.set("bluesky_handle", bsky);
      fd.set("verified", "true");
      await saveHandle(fd);
    });
  }
  function del() {
    startDelete(async () => {
      const fd = new FormData();
      fd.set("id", h.id);
      await deleteHandle(fd);
    });
  }

  const busy = saving || deleting;

  return (
    <li
      className={`rounded-[var(--radius-comic)] border-ink p-3 shadow-comic-sm ${
        h.verified ? "bg-surface" : "bg-brand-cream"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-display text-sm uppercase tracking-wide text-brand-ink">
          {h.name}
        </span>
        {!h.verified && (
          <span className="rounded-md border-[2px] border-brand-ink bg-brand-purple px-2 py-0.5 font-display text-[10px] uppercase tracking-wide text-white">
            Proposed — verify
          </span>
        )}

        <label className="ml-auto flex items-center gap-1 text-xs text-brand-ink/60">
          X @
          <input
            value={x}
            onChange={(e) => setX(e.target.value)}
            placeholder="handle"
            className={`${field} w-32`}
          />
          <ProfileLink kind="x" handle={x} />
        </label>

        <label className="flex items-center gap-1 text-xs text-brand-ink/60">
          Bsky @
          <input
            value={bsky}
            onChange={(e) => setBsky(e.target.value)}
            placeholder="handle.bsky.social"
            className={`${field} w-44`}
          />
          <ProfileLink kind="bsky" handle={bsky} />
        </label>

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="focus-comic rounded-md border-ink bg-brand-lime px-3 py-1 font-display text-xs uppercase tracking-wide text-brand-ink shadow-comic-sm hover:-translate-y-0.5 disabled:opacity-50"
        >
          {saving ? "…" : h.verified ? "Save" : "Verify & save"}
        </button>
        <button
          type="button"
          onClick={del}
          disabled={busy}
          className="focus-comic font-mono text-xs uppercase tracking-widest text-brand-ink/50 hover:text-brand-purple disabled:opacity-50"
        >
          {deleting ? "…" : "✕"}
        </button>
      </div>
    </li>
  );
}

function AddHandle() {
  const [name, setName] = useState("");
  const [x, setX] = useState("");
  const [bsky, setBsky] = useState("");
  const [saving, startSave] = useTransition();

  function add() {
    if (!name.trim()) return;
    startSave(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("x_handle", x);
      fd.set("bluesky_handle", bsky);
      fd.set("verified", "true");
      await saveHandle(fd);
      setName("");
      setX("");
      setBsky("");
    });
  }

  return (
    <div className="rounded-[var(--radius-comic)] border-ink bg-surface p-4 shadow-comic">
      <h2 className="font-display text-lg uppercase tracking-wide text-brand-ink">
        Add a verified handle
      </h2>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-brand-ink/60">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cursor"
            className={`${field} w-40`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-brand-ink/60">
          X handle (no @)
          <input
            value={x}
            onChange={(e) => setX(e.target.value)}
            placeholder="cursor_ai"
            className={`${field} w-40`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-brand-ink/60">
          Bluesky handle
          <input
            value={bsky}
            onChange={(e) => setBsky(e.target.value)}
            placeholder="cursor.com"
            className={`${field} w-48`}
          />
        </label>
        <ComicButton
          variant="blue"
          type="button"
          onClick={add}
          disabled={saving || !name.trim()}
        >
          {saving ? "Adding…" : "Add"}
        </ComicButton>
      </div>
    </div>
  );
}

export function HandleRegistry({ handles }: { handles: SocialHandle[] }) {
  const proposed = handles.filter((h) => !h.verified);
  const verified = handles.filter((h) => h.verified);

  return (
    <div className="mt-8 flex flex-col gap-8">
      <AddHandle />

      {proposed.length > 0 && (
        <section>
          <h2 className="font-display text-xl uppercase tracking-wide text-brand-ink">
            Proposed by AI ({proposed.length})
          </h2>
          <p className="mt-1 text-sm text-brand-ink/60">
            Click “open ↗” to check the account is right, fix the handle if
            needed, then verify. These are never posted until verified.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {proposed.map((h) => (
              <HandleRow key={h.id} h={h} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl uppercase tracking-wide text-brand-ink">
          Verified ({verified.length})
        </h2>
        {verified.length === 0 ? (
          <p className="mt-2 text-sm text-brand-ink/55">
            None yet — add one above, or verify an AI proposal.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {verified.map((h) => (
              <HandleRow key={h.id} h={h} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
