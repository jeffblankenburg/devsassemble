import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { createClient } from "@/lib/supabase/server";
import { deliver } from "@/lib/email/client";
import { SITE_URL } from "@/lib/email/config";
import {
  WelcomeEmail,
  EventReminderEmail,
  EventChangedEmail,
  EventCancelledEmail,
  ForumReplyEmail,
  ReportResolvedEmail,
  AccountSuspendedEmail,
  NewReportEmail,
} from "@/lib/email/templates";

/**
 * DEV-ONLY email preview/send. Renders one template with sample data and sends
 * it to the signed-in user's own address, bypassing preference gating — purely
 * to eyeball real-client rendering. Returns 404 outside development.
 *
 * Usage: /api/dev/test-email?template=welcome  (or reply, reminder, changed,
 * cancelled, report-resolved, new-report, suspended). Remove before shipping.
 */
const SAMPLES: Record<string, { subject: string; element: ReactElement }> = {
  welcome: {
    subject: "[test] Welcome to DevsAssemble 🎉",
    element: <WelcomeEmail name="Ada" />,
  },
  reply: {
    subject: "[test] New reply to your discussion",
    element: (
      <ForumReplyEmail
        topicTitle="Best agent eval harnesses?"
        replierName="Grace H."
        excerpt="I've had good luck wiring an LLM-as-judge with a rubric — happy to share the prompt I use for scoring tool-call traces."
        topicUrl={`${SITE_URL}/discussions/sample`}
        unsubscribeUrl={`${SITE_URL}/unsubscribe/sample-token`}
      />
    ),
  },
  reminder: {
    subject: "[test] Reminder: Ship-It Friday",
    element: (
      <EventReminderEmail
        eventTitle="Ship-It Friday"
        whenLabel="Fri, Oct 10 at 6:00 PM (ET)"
        locationLabel="Online"
        eventUrl={`${SITE_URL}/events/sample`}
        unsubscribeUrl={`${SITE_URL}/unsubscribe/sample-token`}
      />
    ),
  },
  changed: {
    subject: "[test] Updated: Ship-It Friday",
    element: (
      <EventChangedEmail
        eventTitle="Ship-It Friday"
        whenLabel="Fri, Oct 10 at 7:00 PM (ET)"
        changeSummary="the start time changed"
        eventUrl={`${SITE_URL}/events/sample`}
        unsubscribeUrl={`${SITE_URL}/unsubscribe/sample-token`}
      />
    ),
  },
  cancelled: {
    subject: "[test] Cancelled: Ship-It Friday",
    element: (
      <EventCancelledEmail
        eventTitle="Ship-It Friday"
        whenLabel="Fri, Oct 10 at 6:00 PM (ET)"
        unsubscribeUrl={`${SITE_URL}/unsubscribe/sample-token`}
      />
    ),
  },
  "report-resolved": {
    subject: "[test] Your report has been reviewed",
    element: <ReportResolvedEmail status="resolved" contextLabel="a post" />,
  },
  "new-report": {
    subject: "[test] New report filed",
    element: (
      <NewReportEmail
        targetType="post"
        reason="Spam / off-topic promotion"
        reviewUrl={`${SITE_URL}/admin/reports`}
      />
    ),
  },
  suspended: {
    subject: "[test] Your account has been suspended",
    element: <AccountSuspendedEmail name="Ada" />,
  },
};

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("template") ?? "welcome";
  const sample = SAMPLES[key];
  if (!sample) {
    return Response.json(
      { error: `Unknown template "${key}"`, available: Object.keys(SAMPLES) },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const to = searchParams.get("to") ?? user?.email;
  if (!to) {
    return Response.json(
      { error: "Sign in first, or pass ?to=you@example.com" },
      { status: 401 },
    );
  }

  const html = await render(sample.element);
  const text = await render(sample.element, { plainText: true });
  await deliver({ to, subject: sample.subject, html, text });

  const keyIsSet = Boolean(process.env.RESEND_API_KEY);
  return Response.json({
    sent: keyIsSet,
    to,
    template: key,
    note: keyIsSet
      ? "Delivered via Resend — check your inbox."
      : "RESEND_API_KEY empty — logged to server console only (no real send).",
    available: Object.keys(SAMPLES),
  });
}
