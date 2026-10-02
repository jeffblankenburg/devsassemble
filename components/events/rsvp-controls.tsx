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
  currentStatus,
  isAuthed,
  loginHref,
  disabled,
}: {
  eventId: string;
  slug: string;
  currentStatus: RsvpStatus | null;
  isAuthed: boolean;
  loginHref: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <p className="font-display text-lg uppercase tracking-wide text-brand-ink/60">
        RSVPs are closed for this event.
      </p>
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

  const hidden = (
    <>
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="slug" value={slug} />
    </>
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form action={setRsvp}>
        {hidden}
        <input type="hidden" name="status" value="going" />
        <SubmitButton variant={currentStatus === "going" ? "lime" : "ink"} size="lg">
          {currentStatus === "going" ? "✓ You're going" : "I'm going"}
        </SubmitButton>
      </form>

      <form action={setRsvp}>
        {hidden}
        <input type="hidden" name="status" value="interested" />
        <SubmitButton
          variant={currentStatus === "interested" ? "purple" : "ink"}
        >
          {currentStatus === "interested" ? "✓ Interested" : "Interested"}
        </SubmitButton>
      </form>

      {currentStatus && (
        <form action={cancelRsvp}>
          {hidden}
          <button
            type="submit"
            className="focus-comic font-display text-sm uppercase tracking-wide text-brand-ink/60 underline underline-offset-4 hover:text-brand-purple"
          >
            Cancel RSVP
          </button>
        </form>
      )}
    </div>
  );
}
