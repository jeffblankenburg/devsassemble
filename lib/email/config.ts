// Shared email configuration. No secrets here — just the brand palette, the
// public site URL used in links, and the preference-category contract.

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://devsassemble.ai"
).replace(/\/$/, "");

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "DevsAssemble <hello@devsassemble.ai>";

// Brand palette (mirrors app/globals.css) — inline hex for email-client safety.
export const BRAND = {
  blue: "#2f6bff",
  lime: "#a6e22e",
  purple: "#6d28d9",
  ink: "#0a0a0a",
  cream: "#f7f1e3",
  white: "#ffffff",
} as const;

/**
 * A preference category gates whether a given email sends. "critical" always
 * sends (welcome, suspension, report-resolved) and ignores the toggles; every
 * other category maps to a boolean column on profiles and also respects the
 * master `email_enabled` switch.
 */
export type EmailCategory =
  | "critical"
  | "event_reminders"
  | "event_changes"
  | "forum_replies"
  | "moderation";

/** Maps an opt-in category to its profiles column. "critical" has no column. */
export const CATEGORY_COLUMN: Record<
  Exclude<EmailCategory, "critical">,
  string
> = {
  event_reminders: "notify_event_reminders",
  event_changes: "notify_event_changes",
  forum_replies: "notify_forum_replies",
  moderation: "notify_moderation",
};
