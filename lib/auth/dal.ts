import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "member" | "moderator" | "admin";

export type SessionUser = {
  id: string;
  email: string | null;
  role: Role;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isBanned: boolean;
};

/**
 * Data Access Layer. Following the Next.js 16 auth guidance, authorization
 * checks live here (close to the data) rather than in a layout or proxy.
 * `cache` memoizes the lookup for a single render pass.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username, display_name, avatar_url, is_banned")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    role: (profile?.role as Role) ?? "member",
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    isBanned: profile?.is_banned ?? false,
  };
});

/** Require an authenticated, non-banned user or redirect to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.isBanned) redirect("/banned");
  return user;
}

/** Require a moderator or admin, or send unauthorized users home. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "moderator") redirect("/");
  return user;
}
