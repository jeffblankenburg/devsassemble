import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/app/profile-form";
import { AvatarStudio } from "@/components/profile/avatar-studio";
import { heroAvatarEnabled, heroCooldown } from "@/lib/avatar/gemini";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, bio, website_url, x_url, linkedin_url, base_avatar_url, hero_avatar_url, avatar_preference, hero_generated_at, github_user_id",
    )
    .eq("id", user.id)
    .single();

  const isAdmin = user.role === "admin" || user.role === "moderator";
  const cooldown = heroCooldown(profile?.hero_generated_at ?? null);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
        Your profile
      </h1>
      <p className="mt-2 text-brand-ink/70">
        Signed in as <span className="font-mono">@{user.username}</span>
        {user.email ? ` · ${user.email}` : ""}
      </p>

      <div className="mt-8">
        <AvatarStudio
          baseAvatar={profile?.base_avatar_url ?? null}
          heroAvatar={profile?.hero_avatar_url ?? null}
          preference={profile?.avatar_preference === "hero" ? "hero" : "base"}
          hasGithub={Boolean(profile?.github_user_id)}
          canGenerate={isAdmin || cooldown.canGenerate}
          nextAvailableLabel={isAdmin ? null : cooldown.nextLabel}
          heroEnabled={heroAvatarEnabled()}
        />
      </div>

      <div className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
        <ProfileForm
          profile={{
            display_name: profile?.display_name ?? null,
            bio: profile?.bio ?? null,
            website_url: profile?.website_url ?? null,
            x_url: profile?.x_url ?? null,
            linkedin_url: profile?.linkedin_url ?? null,
          }}
        />
      </div>
    </main>
  );
}
