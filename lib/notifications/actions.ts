"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";

export type NotifState = { ok?: boolean; error?: string };

/**
 * Save the member's email notification preferences. Unchecked toggles are
 * absent from the form, so `=== "on"` cleanly maps presence → boolean. The
 * moderation toggle is only honored for mods/admins.
 */
export async function updateNotificationPrefs(
  _prev: NotifState,
  formData: FormData,
): Promise<NotifState> {
  const user = await requireUser();
  const on = (k: string) => formData.get(k) === "on";

  const patch: Record<string, boolean> = {
    email_enabled: on("email_enabled"),
    notify_event_reminders: on("notify_event_reminders"),
    notify_event_changes: on("notify_event_changes"),
    notify_forum_replies: on("notify_forum_replies"),
  };
  if (user.role === "admin" || user.role === "moderator") {
    patch.notify_moderation = on("notify_moderation");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings/profile");
  return { ok: true };
}
