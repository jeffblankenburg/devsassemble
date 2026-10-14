import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type ManagedUser = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: "member" | "moderator" | "admin";
  capabilities: string[];
  is_banned: boolean;
  onboarded_at: string | null;
  created_at: string;
};

/** All members for the admin user-management tool. Admin-gated. */
export async function listManagedUsers(): Promise<ManagedUser[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, role, capabilities, is_banned, onboarded_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(1000);
  return (data ?? []) as ManagedUser[];
}
