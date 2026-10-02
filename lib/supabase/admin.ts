import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — BYPASSES Row Level Security.
 *
 * Use ONLY in trusted server code that must act with elevated privileges:
 * cron route handlers (event reminders), webhook processors, and moderation
 * tooling. Never import this into a Client Component or expose the key.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
