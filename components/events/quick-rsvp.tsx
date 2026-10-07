"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { setRsvp, cancelRsvp } from "@/lib/events/actions";
import type { RsvpStatus } from "@/lib/events/queries";

const chip =
  "focus-comic rounded-md border-[2px] border-brand-ink px-2.5 py-1 font-display text-xs uppercase tracking-wide shadow-comic-sm disabled:opacity-60";

function Chip({
  children,
  active,
  activeClass,
}: {
  children: ReactNode;
  active: boolean;
  activeClass: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-pressed={active}
      disabled={pending}
      className={`${chip} ${
        active ? activeClass : "bg-surface text-brand-ink hover:bg-brand-lime"
      }`}
    >
      {pending ? "…" : children}
    </button>
  );
}

/**
 * Compact RSVP control for event cards — layered above the card's stretched
 * link so it stays interactive. Logged-out visitors get a sign-in chip.
 */
export function QuickRsvp({
  eventId,
  slug,
  currentStatus,
  isAuthed,
  loginHref,
}: {
  eventId: string;
  slug: string;
  currentStatus: RsvpStatus | null;
  isAuthed: boolean;
  loginHref: string;
}) {
  if (!isAuthed) {
    return (
      <Link href={loginHref} className={`${chip} bg-surface text-brand-ink hover:bg-brand-lime`}>
        RSVP — sign in
      </Link>
    );
  }

  const hidden = (
    <>
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="slug" value={slug} />
    </>
  );
  const going = currentStatus === "going";
  const interested = currentStatus === "interested";

  // Clicking the active status again cancels it (toggle off).
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={going ? cancelRsvp : setRsvp}>
        {hidden}
        <input type="hidden" name="status" value="going" />
        <Chip active={going} activeClass="bg-brand-lime text-brand-ink">
          {going ? "✓ Going" : "Going"}
        </Chip>
      </form>
      <form action={interested ? cancelRsvp : setRsvp}>
        {hidden}
        <input type="hidden" name="status" value="interested" />
        <Chip active={interested} activeClass="bg-brand-purple text-white">
          {interested ? "✓ Interested" : "Interested"}
        </Chip>
      </form>
    </div>
  );
}
