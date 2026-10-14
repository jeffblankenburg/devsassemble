"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { updateUserAccess, setUserBanned } from "@/lib/users/actions";
import { CAPABILITIES } from "@/lib/auth/capabilities";
import type { ManagedUser } from "@/lib/users/queries";

function UserRow({ u, isSelf }: { u: ManagedUser; isSelf: boolean }) {
  const [isAdmin, setIsAdmin] = useState(u.role === "admin");
  const [caps, setCaps] = useState<Set<string>>(new Set(u.capabilities));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [banning, startBan] = useTransition();

  function toggleCap(key: string) {
    setCaps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSaved(false);
  }

  function save() {
    setError(null);
    startSave(async () => {
      const res = await updateUserAccess({
        userId: u.id,
        isAdmin,
        capabilities: [...caps],
      });
      if (res?.error) setError(res.error);
      else setSaved(true);
    });
  }

  function toggleBan() {
    startBan(async () => {
      const fd = new FormData();
      fd.set("user_id", u.id);
      fd.set("banned", (!u.is_banned).toString());
      await setUserBanned(fd);
    });
  }

  const name = u.display_name || u.username || "member";

  return (
    <li className="rounded-[var(--radius-comic)] border-ink bg-surface p-4 shadow-comic-sm">
      <div className="flex flex-wrap items-center gap-3">
        {u.avatar_url ? (
          <Image
            src={u.avatar_url}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-md border-[2px] border-brand-ink object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-md border-[2px] border-brand-ink bg-brand-cream font-display text-brand-ink">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-sm uppercase tracking-wide text-brand-ink">
            {name}
            {isSelf && <span className="ml-2 text-brand-ink/40">(you)</span>}
          </p>
          {u.username && (
            <p className="truncate font-mono text-xs text-brand-ink/55">
              @{u.username}
            </p>
          )}
        </div>

        {u.is_banned && (
          <span className="rounded-md border-[2px] border-brand-ink bg-brand-ink px-2 py-0.5 font-display text-[10px] uppercase text-white">
            Banned
          </span>
        )}

        <button
          type="button"
          aria-pressed={isAdmin}
          disabled={isSelf}
          onClick={() => {
            setIsAdmin((v) => !v);
            setSaved(false);
          }}
          className={`focus-comic ml-auto rounded-md border-[2px] border-brand-ink px-3 py-1 font-display text-xs uppercase tracking-wide shadow-comic-sm disabled:opacity-50 ${
            isAdmin ? "bg-brand-purple text-white" : "bg-white text-brand-ink"
          }`}
        >
          {isAdmin ? "★ Admin — full access" : "Make admin"}
        </button>
      </div>

      {!isAdmin && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CAPABILITIES.map((c) => {
            const on = caps.has(c.key);
            return (
              <button
                key={c.key}
                type="button"
                disabled={isSelf}
                onClick={() => toggleCap(c.key)}
                aria-pressed={on}
                title={c.desc}
                className={`focus-comic rounded-md border-[2px] border-brand-ink px-2.5 py-1 font-display text-xs uppercase tracking-wide shadow-comic-sm disabled:opacity-50 ${
                  on ? "bg-brand-blue text-white" : "bg-white text-brand-ink"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {!isSelf && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t-2 border-brand-ink/10 pt-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="focus-comic rounded-md border-ink bg-brand-lime px-3 py-1 font-display text-xs uppercase tracking-wide text-brand-ink shadow-comic-sm hover:-translate-y-0.5 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save access"}
          </button>
          <button
            type="button"
            onClick={toggleBan}
            disabled={banning}
            className="focus-comic font-mono text-xs uppercase tracking-widest text-brand-ink/50 hover:text-brand-purple disabled:opacity-50"
          >
            {banning ? "…" : u.is_banned ? "Unban" : "Ban"}
          </button>
          {saved && <span className="text-xs text-brand-ink/50">Saved ✓</span>}
          {error && <span className="text-xs text-brand-purple">{error}</span>}
        </div>
      )}
    </li>
  );
}

export function UserManager({
  users,
  currentUserId,
}: {
  users: ManagedUser[];
  currentUserId: string;
}) {
  return (
    <ul className="mt-8 flex flex-col gap-3">
      {users.map((u) => (
        <UserRow key={u.id} u={u} isSelf={u.id === currentUserId} />
      ))}
    </ul>
  );
}
