import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/email/config";

/**
 * One-click unsubscribe target. The same URL is used two ways:
 * - POST: RFC 8058 one-click (sent by the mail client via List-Unsubscribe-Post)
 * - GET:  a human clicking the footer link in a browser
 * Both flip the master `email_enabled` switch off. The token is an unguessable
 * UUID, so no auth is required; critical mail (safety/account) still sends.
 */
async function unsubscribe(token: string): Promise<boolean> {
  if (!token) return false;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ email_enabled: false })
    .eq("unsubscribe_token", token)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  await unsubscribe(token);
  return new Response(null, { status: 200 });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ok = await unsubscribe(token);
  return new Response(page(ok), {
    status: ok ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function page(ok: boolean): string {
  const body = ok
    ? `<h1>You're unsubscribed</h1>
       <p>You won't receive notification emails from DevsAssemble anymore.</p>
       <p>Changed your mind? You can re-enable email and fine-tune which
       notifications you get in your settings.</p>`
    : `<h1>Link expired or invalid</h1>
       <p>We couldn't process that unsubscribe link. You can manage email
       preferences directly in your settings instead.</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Unsubscribe · DevsAssemble</title>
<style>
  body{margin:0;background:#f7f1e3;color:#0a0a0a;
    font-family:Verdana,Geneva,sans-serif;display:flex;min-height:100vh;
    align-items:center;justify-content:center;padding:24px}
  .card{max-width:520px;background:#fff;border:3px solid #0a0a0a;border-radius:12px;
    box-shadow:4px 4px 0 0 #0a0a0a;padding:32px}
  h1{font-size:24px;margin:0 0 12px;text-transform:uppercase}
  p{font-size:15px;line-height:1.6;margin:0 0 12px}
  a{display:inline-block;margin-top:8px;background:#2f6bff;color:#fff;
    border:3px solid #0a0a0a;border-radius:10px;padding:11px 22px;
    text-decoration:none;font-weight:700;text-transform:uppercase}
</style></head><body><div class="card">${body}
<a href="${SITE_URL}/settings/profile">Notification settings</a>
</div></body></html>`;
}
