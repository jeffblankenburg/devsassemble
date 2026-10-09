import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Link,
  Hr,
} from "@react-email/components";
import { BRAND, SITE_URL } from "@/lib/email/config";

// All styling is inline for email-client safety. The comic look survives as a
// chunky ink border + accent header bar; box-shadow and rounded corners degrade
// gracefully in clients that ignore them.

type Accent = "blue" | "lime" | "purple";
const ACCENT_HEX: Record<Accent, string> = {
  blue: BRAND.blue,
  lime: BRAND.lime,
  purple: BRAND.purple,
};

const page = { backgroundColor: BRAND.cream, margin: 0, padding: "24px 0" };
const container = {
  width: "100%",
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: BRAND.white,
  border: `3px solid ${BRAND.ink}`,
  borderRadius: "12px",
  overflow: "hidden",
};
const wordmark = {
  fontFamily: "Verdana, Geneva, sans-serif",
  fontWeight: 800,
  fontSize: "20px",
  letterSpacing: "1px",
  color: BRAND.ink,
  margin: 0,
  textTransform: "uppercase" as const,
};
const bodyPad = { padding: "28px 32px" };
const h1 = {
  fontFamily: "Verdana, Geneva, sans-serif",
  fontWeight: 800,
  fontSize: "22px",
  lineHeight: "1.2",
  color: BRAND.ink,
  margin: "0 0 12px",
};
const p = {
  fontFamily: "Verdana, Geneva, sans-serif",
  fontSize: "15px",
  lineHeight: "1.6",
  color: BRAND.ink,
  margin: "0 0 14px",
};
const quote = {
  ...p,
  borderLeft: `3px solid ${BRAND.ink}`,
  padding: "4px 0 4px 14px",
  color: "#333333",
  fontStyle: "italic" as const,
  margin: "0 0 18px",
};
const footer = {
  fontFamily: "Verdana, Geneva, sans-serif",
  fontSize: "12px",
  lineHeight: "1.6",
  color: "#6b6b6b",
  margin: "4px 0 0",
};

function button(accent: Accent) {
  const bg = ACCENT_HEX[accent];
  return {
    display: "inline-block",
    backgroundColor: bg,
    color: accent === "lime" ? BRAND.ink : BRAND.white,
    border: `3px solid ${BRAND.ink}`,
    borderRadius: "10px",
    padding: "11px 22px",
    fontFamily: "Verdana, Geneva, sans-serif",
    fontWeight: 700,
    fontSize: "15px",
    textDecoration: "none",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  };
}

/** Shared frame: accent bar + wordmark header, body, and a footer. */
function Layout({
  preview,
  accent = "blue",
  children,
  unsubscribeUrl,
}: {
  preview: string;
  accent?: Accent;
  children: React.ReactNode;
  unsubscribeUrl?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={page}>
        <Container style={container}>
          <Section style={{ height: "8px", backgroundColor: ACCENT_HEX[accent] }} />
          <Section style={{ padding: "18px 32px 0" }}>
            <Text style={wordmark}>DevsAssemble</Text>
          </Section>
          <Section style={bodyPad}>{children}</Section>
          <Hr style={{ borderColor: "#e5e0d2", margin: 0 }} />
          <Section style={{ padding: "16px 32px 22px" }}>
            <Text style={footer}>
              You&apos;re getting this from{" "}
              <Link href={SITE_URL} style={{ color: "#6b6b6b" }}>
                DevsAssemble
              </Link>
              .{" "}
              <Link href={`${SITE_URL}/settings/profile`} style={{ color: "#6b6b6b" }}>
                Notification settings
              </Link>
              {unsubscribeUrl ? (
                <>
                  {" · "}
                  <Link href={unsubscribeUrl} style={{ color: "#6b6b6b" }}>
                    Unsubscribe from all email
                  </Link>
                </>
              ) : null}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function CTA({ href, accent = "blue", label }: { href: string; accent?: Accent; label: string }) {
  return (
    <Section style={{ margin: "6px 0 18px" }}>
      <Link href={href} style={button(accent)}>
        {label}
      </Link>
    </Section>
  );
}

// --- Templates ---------------------------------------------------------------

export function WelcomeEmail({ name }: { name: string }) {
  return (
    <Layout preview="Welcome to DevsAssemble" accent="lime">
      <Heading style={h1}>Welcome{name ? `, ${name}` : ""}! 🎉</Heading>
      <Text style={p}>
        You&apos;re in. DevsAssemble is where builders share what they&apos;re
        making, talk shop in the discussions, and show up for community events.
      </Text>
      <Text style={p}>
        We&apos;ll email you about things you opt into — replies to your
        discussions and reminders for events you RSVP to. You control all of it.
      </Text>
      <CTA href={`${SITE_URL}/settings/profile`} accent="lime" label="Set your preferences" />
      <Text style={p}>See you in the assembly.</Text>
    </Layout>
  );
}

export function EventReminderEmail({
  eventTitle,
  whenLabel,
  locationLabel,
  eventUrl,
  unsubscribeUrl,
}: {
  eventTitle: string;
  whenLabel: string;
  locationLabel?: string | null;
  eventUrl: string;
  unsubscribeUrl?: string;
}) {
  return (
    <Layout preview={`Reminder: ${eventTitle} is coming up`} unsubscribeUrl={unsubscribeUrl}>
      <Heading style={h1}>{eventTitle} is coming up</Heading>
      <Text style={p}>A quick heads-up for an event you RSVP&apos;d to:</Text>
      <Text style={{ ...p, fontWeight: 700 }}>
        🗓 {whenLabel}
        {locationLabel ? ` · 📍 ${locationLabel}` : ""}
      </Text>
      <CTA href={eventUrl} label="View event" />
    </Layout>
  );
}

export function EventChangedEmail({
  eventTitle,
  whenLabel,
  changeSummary,
  eventUrl,
  unsubscribeUrl,
}: {
  eventTitle: string;
  whenLabel: string;
  changeSummary: string;
  eventUrl: string;
  unsubscribeUrl?: string;
}) {
  return (
    <Layout preview={`Update: ${eventTitle}`} accent="purple" unsubscribeUrl={unsubscribeUrl}>
      <Heading style={h1}>An event you&apos;re attending changed</Heading>
      <Text style={p}>
        <strong>{eventTitle}</strong> has been updated: {changeSummary}
      </Text>
      <Text style={{ ...p, fontWeight: 700 }}>🗓 Now: {whenLabel}</Text>
      <CTA href={eventUrl} accent="purple" label="See the details" />
    </Layout>
  );
}

export function EventCancelledEmail({
  eventTitle,
  whenLabel,
  unsubscribeUrl,
}: {
  eventTitle: string;
  whenLabel: string;
  unsubscribeUrl?: string;
}) {
  return (
    <Layout preview={`Cancelled: ${eventTitle}`} accent="purple" unsubscribeUrl={unsubscribeUrl}>
      <Heading style={h1}>Event cancelled</Heading>
      <Text style={p}>
        Unfortunately <strong>{eventTitle}</strong> ({whenLabel}) has been
        cancelled. Sorry for the change of plans.
      </Text>
      <CTA href={`${SITE_URL}/events`} accent="purple" label="Browse other events" />
    </Layout>
  );
}

export function ForumReplyEmail({
  topicTitle,
  replierName,
  excerpt,
  topicUrl,
  unsubscribeUrl,
}: {
  topicTitle: string;
  replierName: string;
  excerpt: string;
  topicUrl: string;
  unsubscribeUrl?: string;
}) {
  return (
    <Layout preview={`${replierName} replied to “${topicTitle}”`} unsubscribeUrl={unsubscribeUrl}>
      <Heading style={h1}>New reply to your discussion</Heading>
      <Text style={p}>
        <strong>{replierName}</strong> replied to{" "}
        <strong>“{topicTitle}”</strong>:
      </Text>
      <Text style={quote}>{excerpt}</Text>
      <CTA href={topicUrl} label="Read & reply" />
    </Layout>
  );
}

export function ReportResolvedEmail({
  status,
  contextLabel,
}: {
  status: "resolved" | "dismissed";
  contextLabel: string;
}) {
  const resolved = status === "resolved";
  return (
    <Layout preview="Your report has been reviewed">
      <Heading style={h1}>Your report has been reviewed</Heading>
      <Text style={p}>
        Thanks for helping keep DevsAssemble healthy. A moderator reviewed your
        report about {contextLabel} and marked it{" "}
        <strong>{resolved ? "resolved" : "dismissed"}</strong>.
      </Text>
      <Text style={p}>
        {resolved
          ? "We took action where appropriate."
          : "No action was needed this time, but we appreciate the flag."}
      </Text>
    </Layout>
  );
}

export function AccountSuspendedEmail({ name }: { name: string }) {
  return (
    <Layout preview="Your DevsAssemble account has been suspended" accent="purple">
      <Heading style={h1}>Your account has been suspended</Heading>
      <Text style={p}>
        Hi{name ? ` ${name}` : ""}, your DevsAssemble account has been suspended
        for violating our community guidelines. You can still browse public
        content, but posting, replying, and RSVPs are disabled.
      </Text>
      <Text style={p}>
        If you think this was a mistake, reply to this email and we&apos;ll take
        a look.
      </Text>
    </Layout>
  );
}

export function NewReportEmail({
  targetType,
  reason,
  reviewUrl,
}: {
  targetType: string;
  reason: string;
  reviewUrl: string;
}) {
  return (
    <Layout preview="New moderation report filed" accent="purple">
      <Heading style={h1}>New report filed</Heading>
      <Text style={p}>
        A member reported a <strong>{targetType}</strong>.
      </Text>
      <Text style={quote}>{reason || "No reason provided."}</Text>
      <CTA href={reviewUrl} accent="purple" label="Review in moderation queue" />
    </Layout>
  );
}

export function TweetDraftsReadyEmail({
  preview,
  reviewUrl,
}: {
  preview: string;
  reviewUrl: string;
}) {
  return (
    <Layout preview="Today's tweet drafts are ready" accent="lime">
      <Heading style={h1}>Today&apos;s tweet drafts are ready 🐦</Heading>
      <Text style={p}>Claude drafted today&apos;s options for @devsassembleAI:</Text>
      <Text style={quote}>{preview}</Text>
      <Text style={p}>
        Review, edit, and post the one you like — nothing goes out without your
        approval.
      </Text>
      <CTA href={reviewUrl} accent="lime" label="Review & post" />
    </Layout>
  );
}
