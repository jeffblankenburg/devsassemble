import "server-only";

import { Resend } from "resend";
import { FROM_EMAIL } from "@/lib/email/config";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export type DeliverInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
};

/**
 * Send one email through Resend. When RESEND_API_KEY is unset (local dev), the
 * message is logged instead of sent, so flows work end to end without creds.
 * Never throws — delivery failures are logged so callers (fired via after())
 * don't surface email errors to users.
 */
export async function deliver({
  to,
  subject,
  html,
  text,
  headers,
}: DeliverInput): Promise<void> {
  if (!resend) {
    console.log(`[email:dev] → ${to} · ${subject}`);
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
      headers,
    });
    if (error) console.error(`[email] send failed → ${to}:`, error);
  } catch (err) {
    console.error(`[email] send threw → ${to}:`, err);
  }
}
