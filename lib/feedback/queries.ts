import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type FeedbackItem = {
  id: string;
  category: "bug" | "idea" | "question" | "other";
  message: string;
  page_url: string | null;
  email: string | null;
  user_id: string | null;
  status: "open" | "resolved";
  created_at: string;
  author: { username: string | null; display_name: string | null } | null;
};

/** All feedback, open first. Admin-gated (RLS blocks non-secret clients). */
export async function listFeedback(): Promise<FeedbackItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("feedback")
    .select(
      "id, category, message, page_url, email, user_id, status, created_at, author:profiles!feedback_user_id_fkey ( username, display_name )",
    )
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as FeedbackItem[];
}
