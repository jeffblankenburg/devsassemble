"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAPABILITY_KEYS } from "@/lib/auth/capabilities";

/**
 * Set a user's role + capabilities. Admin (superuser) is the one coarse role;
 * everyone else is a member whose admin access is exactly their capabilities.
 * You can't edit your own access here (so you can't lock yourself out).
 */
export async function updateUserAccess(input: {
  userId: string;
  isAdmin: boolean;
  capabilities: string[];
}): Promise<{ error?: string }> {
  const me = await requireCapability("manage_users");
  if (!input.userId) return { error: "Missing user." };
  if (input.userId === me.id) {
    return { error: "You can't change your own access." };
  }

  const role = input.isAdmin ? "admin" : "member";
  const capabilities = input.isAdmin
    ? []
    : (input.capabilities ?? []).filter((c) =>
        (CAPABILITY_KEYS as string[]).includes(c),
      );

  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ role, capabilities })
    .eq("id", input.userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return {};
}

/** Ban or unban a member (not yourself). */
export async function setUserBanned(formData: FormData): Promise<void> {
  const me = await requireCapability("manage_users");
  const userId = String(formData.get("user_id") ?? "");
  const banned = formData.get("banned") === "true";
  if (!userId || userId === me.id) return;

  const db = createAdminClient();
  await db.from("profiles").update({ is_banned: banned }).eq("id", userId);
  revalidatePath("/admin/users");
}
