import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/app/profile-form";
import { HeroAvatarGenerator } from "@/components/profile/hero-avatar-generator";
import { heroAvatarEnabled } from "@/lib/avatar/gemini";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, website_url, x_url, linkedin_url, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
        Your profile
      </h1>
      <p className="mt-2 text-brand-ink/70">
        Signed in as <span className="font-mono">@{user.username}</span>
        {user.email ? ` · ${user.email}` : ""}
      </p>

      {heroAvatarEnabled() && (
        <div className="mt-8">
          <HeroAvatarGenerator currentAvatar={profile?.avatar_url ?? null} />
        </div>
      )}

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
