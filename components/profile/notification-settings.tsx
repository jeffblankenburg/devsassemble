"use client";

import { useActionState } from "react";
import {
  updateNotificationPrefs,
  type NotifState,
} from "@/lib/notifications/actions";
import { ComicButton } from "@/components/brand/comic-button";
import { ComicSwitch } from "@/components/profile/comic-switch";

export type NotificationPrefs = {
  email_enabled: boolean;
  notify_event_reminders: boolean;
  notify_event_changes: boolean;
  notify_forum_replies: boolean;
  notify_moderation: boolean;
};

const ROWS: { name: keyof NotificationPrefs; label: string; hint: string }[] = [
  {
    name: "notify_event_reminders",
    label: "Event reminders",
    hint: "A heads-up the day before events you RSVP to.",
  },
  {
    name: "notify_event_changes",
    label: "Event updates",
    hint: "When an event you're attending changes time or is cancelled.",
  },
  {
    name: "notify_forum_replies",
    label: "Discussion replies",
    hint: "When someone replies to a topic you started.",
  },
];

function Row({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-display text-lg uppercase tracking-wide text-brand-ink">
          {label}
        </div>
        <div className="text-xs text-brand-ink/55">{hint}</div>
      </div>
      <ComicSwitch name={name} defaultChecked={defaultChecked} />
    </div>
  );
}

export function NotificationSettings({
  prefs,
  isModerator,
}: {
  prefs: NotificationPrefs;
  isModerator: boolean;
}) {
  const [state, action, pending] = useActionState<NotifState, FormData>(
    updateNotificationPrefs,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <Row
        name="email_enabled"
        label="Email me"
        hint="Master switch for notification email. Account & safety emails always send."
        defaultChecked={prefs.email_enabled}
      />
      <hr className="border-brand-ink/15" />
      {ROWS.map((r) => (
        <Row key={r.name} {...r} defaultChecked={prefs[r.name]} />
      ))}
      {isModerator && (
        <Row
          name="notify_moderation"
          label="Moderation alerts"
          hint="When a member files a report to review."
          defaultChecked={prefs.notify_moderation}
        />
      )}

      <div className="flex items-center gap-4">
        <ComicButton type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </ComicButton>
        {state.ok && (
          <span className="text-sm text-brand-ink/60">Saved.</span>
        )}
        {state.error && (
          <span className="text-sm text-brand-purple">{state.error}</span>
        )}
      </div>
    </form>
  );
}
