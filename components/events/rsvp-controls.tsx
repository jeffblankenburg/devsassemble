"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { setRsvp, cancelRsvp } from "@/lib/events/actions";
import { ComicButton } from "@/components/brand/comic-button";
import type { RsvpStatus } from "@/lib/events/queries";

type Variant = "blue" | "lime" | "purple" | "ink";

function SubmitButton({
  children,
  variant,
  size,
}: {
  children: ReactNode;
  variant: Variant;
  size?: "md" | "lg";
}) {
  const { pending } = useFormStatus();
  return (
    <ComicButton type="submit" variant={variant} size={size} disabled={pending}>
      {pending ? "…" : children}
    </ComicButton>
  );
}

/**
 * RSVP controls. Logged-out visitors get the funnel: a sign-in CTA that returns
 * them to this event. Logged-in members get going/interested toggles + cancel.
 */
export function RsvpControls({
  eventId,
  slug,
  occurrenceStart,
  currentStatus,
  isAuthed,
  loginHref,
  disabled,
  externalRsvpUrl,
}: {
  eventId: string;
  slug: string;
  occurrenceStart: string;
  currentStatus: RsvpStatus | null;
  isAuthed: boolean;
  loginHref: string;
  disabled?: boolean;
  externalRsvpUrl?: string | null;
}) {
  if (disabled) {
    return (
      <p className="font-display text-lg uppercase tracking-wide text-brand-ink/60">
        RSVPs are closed for this event.
      </p>
    );
  }

  const hidden = (
    <>
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="occurrence_start" value={occurrenceStart} />
    </>
  );
  const going = currentStatus === "going";
  const interested = currentStatus === "interested";

  const interestedToggle = isAuthed ? (
    <form action={interested ? cancelRsvp : setRsvp} className="w-fit">
      {hidden}
      <input type="hidden" name="status" value="interested" />
      <SubmitButton variant={interested ? "purple" : "ink"}>
        {interested ? "✓ Interested" : "Interested"}
      </SubmitButton>
    </form>
  ) : (
    <ComicButton href={loginHref} variant="ink">
      Sign in to mark interested
    </ComicButton>
  );

  // External RSVP: the organizer registers attendees on their own site. We send
  // people there instead of tracking "going" — but members can still be interested.
  if (externalRsvpUrl) {
    return (
      <div className="flex flex-col items-start gap-3">
        <a
          href={externalRsvpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-comic inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-comic)] border-ink bg-brand-blue px-8 py-4 font-display text-xl uppercase tracking-wide text-white shadow-comic transition-transform duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-comic-lg sm:text-2xl"
        >
          RSVP on the organizer&apos;s site →
        </a>
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          Registration is handled off-site — you can still mark yourself interested.
        </p>
        {interestedToggle}
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="flex flex-col gap-2">
        <ComicButton href={loginHref} variant="blue" size="lg">
          RSVP — sign in to join
        </ComicButton>
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          Free · Sign in with GitHub to RSVP
        </p>
      </div>
    );
  }

  // Clicking the active status again cancels it (toggle off).
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form action={going ? cancelRsvp : setRsvp}>
        {hidden}
        <input type="hidden" name="status" value="going" />
        <SubmitButton variant={going ? "lime" : "ink"} size="lg">
          {going ? "✓ You're going" : "I'm going"}
        </SubmitButton>
      </form>

      <form action={interested ? cancelRsvp : setRsvp}>
        {hidden}
        <input type="hidden" name="status" value="interested" />
        <SubmitButton variant={interested ? "purple" : "ink"}>
          {interested ? "✓ Interested" : "Interested"}
        </SubmitButton>
      </form>
    </div>
  );
}
