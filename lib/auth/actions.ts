"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirects";

/** Resolve the site origin for auth redirects. */
async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  // In local dev, always trust the actual request host so OAuth returns to
  // whatever localhost port you're on — not the configured site URL.
  if (process.env.NODE_ENV === "development" && host) {
    return `${proto}://${host}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  return host ? `${proto}://${host}` : "";
}

/** Start the GitHub OAuth flow, then redirect the browser to GitHub. */
export async function signInWithGithub(formData?: FormData) {
  const supabase = await createClient();
  const origin = await getOrigin();
  const next = safeNext(formData?.get("next"));
  const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: callbackUrl,
      scopes: "read:user user:email",
    },
  });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
