"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/validation/auth";
import { safeNext } from "@/lib/auth/redirects";

export type AuthState = {
  ok?: boolean;
  message?: string;
  error?: string;
};

/** Resolve the site origin for auth redirects (env first, then request host). */
async function getOrigin() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** Email one-time code / magic link sign-in (delivered via Resend SMTP). */
export async function signInWithOtp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const next = safeNext(formData.get("next"));
  const confirmUrl = `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: confirmUrl,
    },
  });

  if (error) return { error: error.message };
  return {
    ok: true,
    message: `We sent a sign-in link to ${parsed.data.email}. Check your inbox.`,
  };
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
