"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import {
  heroAvatarEnabled,
  generateHeroImage,
  fetchImageAsBase64,
} from "@/lib/avatar/gemini";

export type AvatarState = { ok?: boolean; error?: string; avatarUrl?: string };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function revalidateProfile(username: string | null) {
  revalidatePath("/settings/profile");
  if (username) revalidatePath(`/u/${username}`);
}

/** Set the base (normal) photo to the member's GitHub avatar. */
export async function useGithubAvatar(): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("github_user_id, avatar_preference")
    .eq("id", user.id)
    .single();
  if (!p?.github_user_id) return;

  const url = `https://avatars.githubusercontent.com/u/${p.github_user_id}?v=4`;
  const patch: Record<string, unknown> = { base_avatar_url: url };
  if (p.avatar_preference !== "hero") patch.avatar_url = url;

  await supabase.from("profiles").update(patch).eq("id", user.id);
  await revalidateProfile(user.username);
}

/** Upload a photo to use as the base (normal) avatar. */
export async function uploadBasePhoto(
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const user = await requireUser();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "That file isn't an image." };
  }
  if (file.size > 4 * 1024 * 1024) {
    return { error: "Please keep photos under 4 MB." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type.includes("png")
    ? "png"
    : file.type.includes("webp")
      ? "webp"
      : "jpg";
  const path = `${user.id}/base-${Date.now()}.${ext}`;

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (uploadError) return { error: uploadError.message };

  const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data
    .publicUrl;

  const { data: p } = await supabase
    .from("profiles")
    .select("avatar_preference")
    .eq("id", user.id)
    .single();
  const patch: Record<string, unknown> = { base_avatar_url: publicUrl };
  if (p?.avatar_preference !== "hero") patch.avatar_url = publicUrl;

  const { error: updateError } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
  if (updateError) return { error: updateError.message };

  await revalidateProfile(user.username);
  return { ok: true, avatarUrl: publicUrl };
}

/** Choose which avatar to display: 'base' (normal) or 'hero'. */
export async function setAvatarPreference(formData: FormData): Promise<void> {
  const user = await requireUser();
  const pref = formData.get("preference") === "hero" ? "hero" : "base";

  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("base_avatar_url, hero_avatar_url")
    .eq("id", user.id)
    .single();

  const effective =
    pref === "hero" ? (p?.hero_avatar_url ?? p?.base_avatar_url) : p?.base_avatar_url;

  await supabase
    .from("profiles")
    .update({ avatar_preference: pref, avatar_url: effective ?? null })
    .eq("id", user.id);
  await revalidateProfile(user.username);
}

/** Generate a superhero version of the base photo (once per week). */
export async function generateHeroAvatar(
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const user = await requireUser();

  if (!heroAvatarEnabled()) {
    return { error: "Superhero avatars aren't enabled yet." };
  }
  if (formData.get("consent") !== "on") {
    return { error: "Please agree to the notice before generating." };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("base_avatar_url, hero_generated_at")
    .eq("id", user.id)
    .single();

  if (!profile?.base_avatar_url) {
    return { error: "Add a photo first (GitHub or upload) to transform." };
  }

  if (profile.hero_generated_at) {
    const elapsed = Date.now() - new Date(profile.hero_generated_at).getTime();
    if (elapsed < WEEK_MS) {
      const next = new Date(
        new Date(profile.hero_generated_at).getTime() + WEEK_MS,
      );
      return {
        error: `You can summon a new hero on ${next.toLocaleDateString()}.`,
      };
    }
  }

  const source = await fetchImageAsBase64(profile.base_avatar_url);
  if (!source) return { error: "Couldn't load your photo to transform." };

  const result = await generateHeroImage(source);
  if (!result.image) {
    return {
      error: result.error ?? "Image generation failed — try again in a moment.",
    };
  }
  const generated = result.image;

  const bytes = Buffer.from(generated.base64, "base64");
  const ext = generated.mimeType.includes("png") ? "png" : "jpg";
  const path = `${user.id}/hero-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, { contentType: generated.mimeType, upsert: true });
  if (uploadError) return { error: uploadError.message };

  const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data
    .publicUrl;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      hero_avatar_url: publicUrl,
      hero_generated_at: new Date().toISOString(),
      avatar_preference: "hero",
      avatar_url: publicUrl,
    })
    .eq("id", user.id);
  if (updateError) return { error: updateError.message };

  await revalidateProfile(user.username);
  return { ok: true, avatarUrl: publicUrl };
}
