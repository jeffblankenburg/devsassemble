import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { EventCard } from "@/components/events/event-card";
import { getProfileByUsername } from "@/lib/profile/queries";
import { getUpcomingEventsForUser } from "@/lib/events/queries";

// Inline param type — see docs/DECISIONS.md (generated route types unavailable here).
type ProfilePageProps = { params: Promise<{ username: string }> };

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: "Profile not found" };
  const name = profile.display_name ?? `@${profile.username}`;
  return {
    title: name,
    description: profile.bio ?? `${name} on DevsAssemble.`,
  };
}

function LinkPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-comic rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-1 font-mono text-sm text-brand-ink transition-transform hover:-translate-y-0.5"
    >
      {label}
    </a>
  );
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const upcoming = await getUpcomingEventsForUser(profile.id);
  const name = profile.display_name ?? `@${profile.username}`;
  const joined = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(profile.created_at));

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={name}
              width={96}
              height={96}
              className="h-24 w-24 rounded-full border-ink object-cover shadow-comic"
            />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full border-ink bg-brand-lime font-display text-4xl text-brand-ink shadow-comic">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-4xl uppercase tracking-wide text-brand-ink sm:text-5xl">
                {name}
              </h1>
              {profile.role !== "member" && (
                <span className="rounded-md border-ink bg-brand-purple px-2 py-0.5 font-display text-xs uppercase text-white">
                  {profile.role}
                </span>
              )}
            </div>
            <p className="font-mono text-brand-ink/70">@{profile.username}</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted">
              Assembled since {joined}
            </p>
          </div>
        </header>

        {profile.bio && (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-ink/85">
            {profile.bio}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {profile.github_username && (
            <LinkPill
              href={`https://github.com/${profile.github_username}`}
              label={`GitHub · @${profile.github_username}`}
            />
          )}
          {profile.website_url && (
            <LinkPill href={profile.website_url} label="Website" />
          )}
          {profile.x_url && <LinkPill href={profile.x_url} label="X" />}
          {profile.linkedin_url && (
            <LinkPill href={profile.linkedin_url} label="LinkedIn" />
          )}
        </div>

        {upcoming.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
              Assembling at
            </h2>
            <div className="mt-4 grid gap-4">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
