import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Public URLs of every superhero a member has generated, newest first. */
export async function listHeroAvatars(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("avatars")
    .list(userId, { limit: 100, sortBy: { column: "name", order: "desc" } });
  if (error || !data) return [];

  return data
    .filter((f) => f.name.startsWith("hero-"))
    .map(
      (f) =>
        supabase.storage.from("avatars").getPublicUrl(`${userId}/${f.name}`)
          .data.publicUrl,
    );
}
