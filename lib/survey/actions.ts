"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/redirects";
import { cleanSurveyInput, type SurveyInput } from "@/lib/survey/questions";

/**
 * Record the registration survey and mark the user onboarded. Uses
 * getSessionUser (not requireUser) so it isn't caught by the onboarding gate it
 * exists to satisfy. On success it redirects onward; validation errors return.
 */
export async function submitSurvey(
  input: SurveyInput & { next?: string },
): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.isBanned) redirect("/banned");

  const clean = cleanSurveyInput(input);
  if (!clean.ok) return { error: clean.error };

  const supabase = await createClient();
  const { error } = await supabase.from("survey_responses").upsert(
    {
      user_id: user.id,
      ...clean.data,
      building: clean.data.building || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };

  await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id);

  redirect(safeNext(input.next));
}
