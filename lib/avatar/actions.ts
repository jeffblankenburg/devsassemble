"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import {
  heroAvatarEnabled,
  generateHeroImage,
  fetchImageAsBase64,
} from "@/lib/avatar/gemini";

export type HeroAvatarState = {
  ok?: boolean;
  error?: string;
  avatarUrl?: string;
};

export async function generateHeroAvatar(
  _prev: HeroAvatarState,
  formData: FormData,
): Promise<HeroAvatarState> {
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
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile?.avatar_url) {
    return { error: "Add a profile photo first so we have something to transform." };
  }

  const source = await fetchImageAsBase64(profile.avatar_url);
  if (!source) {
    return { error: "Couldn't load your current avatar to transform." };
  }

  const generated = await generateHeroImage(source);
  if (!generated) {
    return { error: "Image generation failed — try again in a moment." };
  }

  const bytes = Buffer.from(generated.base64, "base64");
  const ext = generated.mimeType.includes("png") ? "png" : "jpg";
  const path = `${user.id}/hero-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, {
      contentType: generated.mimeType,
      upsert: true,
    });
  if (uploadError) return { error: uploadError.message };

  const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data
    .publicUrl;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);
  if (updateError) return { error: updateError.message };

  revalidatePath("/settings/profile");
  if (user.username) revalidatePath(`/u/${user.username}`);
  return { ok: true, avatarUrl: publicUrl };
}
