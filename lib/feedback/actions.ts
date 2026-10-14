"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser, requireAdmin } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyFeedback } from "@/lib/email/send";

const CATEGORIES = new Set(["bug", "idea", "question", "other"]);

export type FeedbackState = { ok?: boolean; error?: string };

/**
 * Submit feedback from anywhere — anonymous allowed. We attach the signed-in
 * user when present, else keep the optional reply email. Inserts via the
 * secret-key client (no public table access) and emails admins.
 */
export async function submitFeedback(input: {
  category?: string;
  message?: string;
  email?: string;
  pageUrl?: string;
}): Promise<FeedbackState> {
  const message = String(input.message ?? "").trim().slice(0, 4000);
  if (message.length < 3) {
    return { error: "Add a little more detail so we can act on it." };
  }
  const category = CATEGORIES.has(String(input.category)) ? input.category! : "other";
  const email = String(input.email ?? "").trim().slice(0, 200) || null;
  const pageUrl = String(input.pageUrl ?? "").trim().slice(0, 500) || null;

  const user = await getSessionUser();
  const db = createAdminClient();
  const { error } = await db.from("feedback").insert({
    category,
    message,
    email,
    page_url: pageUrl,
    user_id: user?.id ?? null,
  });
  if (error) return { error: error.message };

  const fromLabel = user
    ? `@${user.username ?? "member"}`
    : email
      ? email
      : "anonymous";
  after(() => notifyFeedback({ category, message, fromLabel, pageUrl }));
  return { ok: true };
}

/** Resolve (or re-open) a feedback item. Admin/moderator only. */
export async function resolveFeedback(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const reopen = formData.get("reopen") === "true";

  const db = createAdminClient();
  await db
    .from("feedback")
    .update(
      reopen
        ? { status: "open", resolved_by: null, resolved_at: null }
        : {
            status: "resolved",
            resolved_by: admin.id,
            resolved_at: new Date().toISOString(),
          },
    )
    .eq("id", id);
  revalidatePath("/admin/feedback");
}
