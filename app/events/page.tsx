import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { EventCard } from "@/components/events/event-card";
import { listPublishedEvents } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Upcoming and past DevsAssemble livestreamed meetups. Browse freely; sign in to RSVP.",
};

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rotate-[-2deg] rounded-md border-ink bg-brand-lime px-3 py-1 font-display text-lg uppercase tracking-wide text-brand-ink shadow-comic-sm">
      {children}
    </span>
  );
}

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([
    listPublishedEvents({ when: "upcoming" }),
    listPublishedEvents({ when: "past", limit: 12 }),
  ]);

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
        <header className="flex flex-col gap-3">
          <Eyebrow>Upcoming livestreams</Eyebrow>
          <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink sm:text-6xl">
            Assemble every week
          </h1>
          <p className="max-w-2xl text-brand-ink/75">
            Watch builds happen live, ask questions in chat, and meet the people
            behind the tools. Browsing is open to all — sign in to RSVP.
          </p>
        </header>

        <section className="mt-10">
          {upcoming.length > 0 ? (
            <div className="grid gap-4">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="rounded-[var(--radius-comic)] border-ink bg-surface p-10 text-center shadow-comic">
              <p className="font-display text-2xl uppercase tracking-wide text-brand-ink">
                No upcoming events yet
              </p>
              <p className="mt-2 text-brand-ink/70">
                New livestreams are posted here. Check back soon.
              </p>
            </div>
          )}
        </section>

        {past.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-3xl uppercase tracking-wide text-brand-ink">
              Past events
            </h2>
            <div className="mt-6 grid gap-4 opacity-90">
              {past.map((event) => (
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
