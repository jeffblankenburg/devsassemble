import { NextResponse, after, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirects";
import { sendWelcome } from "@/lib/email/send";

/**
 * OAuth callback (GitHub). Exchanges the `code` for a session, then redirects
 * to `next` (defaults to the dashboard).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const error = searchParams.get("error_description") ?? searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      // Welcome the member on their first successful sign-in (exactly once).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let needsOnboarding = false;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("welcomed_at, onboarded_at")
          .eq("id", user.id)
          .maybeSingle<{
            welcomed_at: string | null;
            onboarded_at: string | null;
          }>();
        if (profile && !profile.welcomed_at) {
          await supabase
            .from("profiles")
            .update({ welcomed_at: new Date().toISOString() })
            .eq("id", user.id);
          after(() => sendWelcome(user.id));
        }
        needsOnboarding = Boolean(profile && !profile.onboarded_at);
      }

      // Respect proxied host in production (Vercel).
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;
      // New members hit the required survey first, then continue to `next`.
      const dest = needsOnboarding
        ? `/onboarding?next=${encodeURIComponent(next)}`
        : next;
      return NextResponse.redirect(`${base}${dest}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}
