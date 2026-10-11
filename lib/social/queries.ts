import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { SocialHandle } from "@/lib/social/handles";

/** All registry rows — unverified (AI proposals) first for review. Admin-gated. */
export async function listSocialHandles(): Promise<SocialHandle[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("social_handles")
    .select("*")
    .order("verified", { ascending: true })
    .order("name");
  return (data ?? []) as SocialHandle[];
}
