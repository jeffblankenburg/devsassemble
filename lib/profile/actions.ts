"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import { profileSchema } from "@/lib/validation/auth";

export type ProfileState = {
  ok?: boolean;
  message?: string;
  error?: string;
};

/** Update the current user's own profile. RLS also restricts this to self. */
export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    bio: formData.get("bio"),
    website_url: formData.get("website_url"),
    x_url: formData.get("x_url"),
    linkedin_url: formData.get("linkedin_url"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Normalize empty strings to null so we don't store blanks.
  const patch = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]),
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings/profile");
  if (user.username) revalidatePath(`/u/${user.username}`);
  return { ok: true, message: "Profile saved." };
}
