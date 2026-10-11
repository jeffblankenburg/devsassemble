import "server-only";

import { createClient } from "@/lib/supabase/server";

export type SurveyRow = {
  user_id: string;
  persona: string | null;
  experience: string | null;
  coding_tools: string[];
  observability: string[];
  hosting: string[];
  databases: string[];
  goals: string[];
  building: string | null;
  created_at: string;
};

/** All survey responses. RLS restricts SELECT to admins (or the owner). */
export async function listSurveyResponses(): Promise<SurveyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("survey_responses")
    .select(
      "user_id, persona, experience, coding_tools, observability, hosting, databases, goals, building, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SurveyRow[];
}
