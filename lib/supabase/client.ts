import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components (Realtime event chat, optimistic
 * like toggles). Enforces RLS as the authed user via the session cookie.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
