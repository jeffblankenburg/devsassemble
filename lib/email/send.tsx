import "server-only";

import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliver } from "@/lib/email/client";
import {
  SITE_URL,
  CATEGORY_COLUMN,
  type EmailCategory,
} from "@/lib/email/config";
import {
  WelcomeEmail,
  EventReminderEmail,
  EventChangedEmail,
  EventCancelledEmail,
  ForumReplyEmail,
  ReportResolvedEmail,
  AccountSuspendedEmail,
  NewReportEmail,
  TweetDraftsReadyEmail,
} from "@/lib/email/templates";

type AdminClient = ReturnType<typeof createAdminClient>;

type BuildCtx = { name: string; unsubscribeUrl?: string };
type Built = { subject: string; element: ReactElement };

const PREF_COLUMNS = Object.values(CATEGORY_COLUMN).join(", ");

/**
 * Core send: resolve the recipient's preferences + live email, honor the
 * category gate, render the template, and deliver with unsubscribe headers.
 * Silently no-ops when the user opted out, has no email, or doesn't exist —
 * callers fire this via after() and never depend on the result.
 */
export async function sendToUser(
  userId: string,
  category: EmailCategory,
  build: (ctx: BuildCtx) => Built,
): Promise<void> {
  const admin = createAdminClient();

  const { data: prefs } = await admin
    .from("profiles")
    .select(`email_enabled, unsubscribe_token, username, display_name, ${PREF_COLUMNS}`)
    .eq("id", userId)
    .single<Record<string, unknown>>();
  if (!prefs) return;

  if (category !== "critical") {
    if (prefs.email_enabled === false) return;
    if (prefs[CATEGORY_COLUMN[category]] === false) return;
  }

  const { data: userResp } = await admin.auth.admin.getUserById(userId);
  const email = userResp?.user?.email;
  if (!email) return;

  const unsubscribeUrl = `${SITE_URL}/unsubscribe/${prefs.unsubscribe_token as string}`;
  const name =
    (prefs.display_name as string | null) ?? (prefs.username as string | null) ?? "";
  // Critical mail isn't unsubscribable, so it omits the footer/header link.
  const unsub = category === "critical" ? undefined : unsubscribeUrl;

  const { subject, element } = build({ name, unsubscribeUrl: unsub });
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const headers = unsub
    ? {
        "List-Unsubscribe": `<${unsub}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      }
    : undefined;

  await deliver({ to: email, subject, html, text, headers });
}

// --- Per-trigger helpers -----------------------------------------------------

export async function sendWelcome(userId: string): Promise<void> {
  await sendToUser(userId, "critical", ({ name }) => ({
    subject: "Welcome to DevsAssemble 🎉",
    element: <WelcomeEmail name={name} />,
  }));
}

export async function notifyForumReply(opts: {
  topicAuthorId: string;
  topicTitle: string;
  slug: string;
  replierName: string;
  excerpt: string;
}): Promise<void> {
  await sendToUser(opts.topicAuthorId, "forum_replies", ({ unsubscribeUrl }) => ({
    subject: `${opts.replierName} replied to “${opts.topicTitle}”`,
    element: (
      <ForumReplyEmail
        topicTitle={opts.topicTitle}
        replierName={opts.replierName}
        excerpt={opts.excerpt}
        topicUrl={`${SITE_URL}/discussions/${opts.slug}`}
        unsubscribeUrl={unsubscribeUrl}
      />
    ),
  }));
}

export async function notifyReportResolved(opts: {
  reporterId: string;
  status: "resolved" | "dismissed";
  contextLabel: string;
}): Promise<void> {
  await sendToUser(opts.reporterId, "critical", () => ({
    subject: "Your report has been reviewed",
    element: (
      <ReportResolvedEmail status={opts.status} contextLabel={opts.contextLabel} />
    ),
  }));
}

/** Email every moderator/admin who hasn't muted moderation mail. */
export async function notifyNewReport(opts: {
  targetType: string;
  reason: string;
}): Promise<void> {
  const admin: AdminClient = createAdminClient();
  const { data: mods } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["admin", "moderator"]);
  const reviewUrl = `${SITE_URL}/admin/reports`;

  await Promise.all(
    (mods ?? []).map((m) =>
      sendToUser((m as { id: string }).id, "moderation", () => ({
        subject: `New report: ${opts.targetType}`,
        element: (
          <NewReportEmail
            targetType={opts.targetType}
            reason={opts.reason}
            reviewUrl={reviewUrl}
          />
        ),
      })),
    ),
  );
}

/** Email everyone who RSVP'd that an event changed or was cancelled. */
export async function notifyEventChange(opts: {
  eventId: string;
  slug: string;
  eventTitle: string;
  whenLabel: string;
  kind: "changed" | "cancelled";
  changeSummary?: string;
}): Promise<void> {
  const admin: AdminClient = createAdminClient();
  const { data: rsvps } = await admin
    .from("rsvps")
    .select("user_id")
    .eq("event_id", opts.eventId);
  const eventUrl = `${SITE_URL}/events/${opts.slug}`;

  await Promise.all(
    (rsvps ?? []).map((r) =>
      sendToUser((r as { user_id: string }).user_id, "event_changes", ({ unsubscribeUrl }) => ({
        subject:
          opts.kind === "cancelled"
            ? `Cancelled: ${opts.eventTitle}`
            : `Updated: ${opts.eventTitle}`,
        element:
          opts.kind === "cancelled" ? (
            <EventCancelledEmail
              eventTitle={opts.eventTitle}
              whenLabel={opts.whenLabel}
              unsubscribeUrl={unsubscribeUrl}
            />
          ) : (
            <EventChangedEmail
              eventTitle={opts.eventTitle}
              whenLabel={opts.whenLabel}
              changeSummary={opts.changeSummary ?? "details were updated"}
              eventUrl={eventUrl}
              unsubscribeUrl={unsubscribeUrl}
            />
          ),
      })),
    ),
  );
}

export async function sendEventReminder(
  userId: string,
  opts: {
    eventTitle: string;
    whenLabel: string;
    locationLabel?: string | null;
    slug: string;
  },
): Promise<void> {
  await sendToUser(userId, "event_reminders", ({ unsubscribeUrl }) => ({
    subject: `Reminder: ${opts.eventTitle}`,
    element: (
      <EventReminderEmail
        eventTitle={opts.eventTitle}
        whenLabel={opts.whenLabel}
        locationLabel={opts.locationLabel}
        eventUrl={`${SITE_URL}/events/${opts.slug}`}
        unsubscribeUrl={unsubscribeUrl}
      />
    ),
  }));
}

export async function notifyAccountSuspended(userId: string): Promise<void> {
  await sendToUser(userId, "critical", ({ name }) => ({
    subject: "Your DevsAssemble account has been suspended",
    element: <AccountSuspendedEmail name={name} />,
  }));
}

/** Tell admins/mods (who haven't muted moderation mail) that drafts are ready. */
export async function notifyTweetDrafts(preview: string): Promise<void> {
  const admin: AdminClient = createAdminClient();
  const { data: mods } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["admin", "moderator"]);
  const reviewUrl = `${SITE_URL}/admin/tweets`;

  await Promise.all(
    (mods ?? []).map((m) =>
      sendToUser((m as { id: string }).id, "moderation", () => ({
        subject: "Today's @devsassembleAI tweet drafts are ready",
        element: <TweetDraftsReadyEmail preview={preview} reviewUrl={reviewUrl} />,
      })),
    ),
  );
}
