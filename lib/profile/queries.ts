import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/auth/dal";

export type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  github_username: string | null;
  website_url: string | null;
  x_url: string | null;
  linkedin_url: string | null;
  role: Role;
  created_at: string;
};

const PROFILE_COLUMNS =
  "id, username, display_name, avatar_url, bio, github_username, website_url, x_url, linkedin_url, role, created_at";

/** Public profile by username (citext — case-insensitive). Null if not found. */
export async function getProfileByUsername(
  username: string,
): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return (data as PublicProfile) ?? null;
}
