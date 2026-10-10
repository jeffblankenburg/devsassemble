import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Small key/value settings store. Currently just the autopilot controls:
// `enabled` is the kill-switch (pauses planning); `mode` is "supervised"
// (plan → admin approves the day) or "auto" (plan → schedule directly).

export type AutopilotMode = "supervised" | "auto";
export type AutopilotSettings = { enabled: boolean; mode: AutopilotMode };

const DEFAULT: AutopilotSettings = { enabled: true, mode: "supervised" };

export async function getAutopilot(): Promise<AutopilotSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "autopilot")
    .maybeSingle<{ value: Partial<AutopilotSettings> }>();
  return { ...DEFAULT, ...(data?.value ?? {}) };
}

export async function setAutopilot(
  patch: Partial<AutopilotSettings>,
): Promise<AutopilotSettings> {
  const admin = createAdminClient();
  const next = { ...(await getAutopilot()), ...patch };
  await admin.from("app_settings").upsert(
    { key: "autopilot", value: next, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  return next;
}
