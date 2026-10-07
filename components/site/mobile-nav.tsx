"use client";

import { useState } from "react";
import Link from "next/link";

type NavItem = { href: string; label: string };

/**
 * Mobile hamburger menu. Shown only below `md`; the desktop nav handles ≥ md.
 * Renders a full-width dropdown anchored to the (sticky/positioned) header.
 * `secondaryItems` and `signOutAction` hold controls that live in the header
 * bar at ≥ md and fold into this menu on smaller screens.
 */
export function MobileNav({
  items,
  ctaHref,
  ctaLabel,
  secondaryItems = [],
  signOutAction,
}: {
  items: NavItem[];
  ctaHref: string;
  ctaLabel: string;
  secondaryItems?: NavItem[];
  signOutAction?: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="focus-comic flex h-10 w-10 items-center justify-center rounded-md border-ink bg-surface text-brand-ink shadow-comic-sm"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <>
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full border-b-[3px] border-brand-ink bg-brand-cream px-6 py-4 shadow-comic">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="focus-comic rounded-md px-2 py-2 font-display text-xl uppercase tracking-wide text-brand-ink hover:bg-brand-lime"
              >
                {item.label}
              </Link>
            ))}
            {secondaryItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="focus-comic rounded-md px-2 py-2 font-display text-xl uppercase tracking-wide text-brand-ink hover:bg-brand-lime"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={ctaHref}
              onClick={() => setOpen(false)}
              className="focus-comic mt-2 rounded-[var(--radius-comic)] border-ink bg-brand-blue px-4 py-2 text-center font-display text-xl uppercase tracking-wide text-white shadow-comic"
            >
              {ctaLabel}
            </Link>
            {signOutAction && (
              <form action={signOutAction} className="mt-1">
                <button
                  type="submit"
                  onClick={() => setOpen(false)}
                  className="focus-comic w-full rounded-md border-ink bg-white px-2 py-2 text-center font-display text-xl uppercase tracking-wide text-brand-ink shadow-comic-sm hover:bg-brand-lime"
                >
                  Sign out
                </button>
              </form>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
