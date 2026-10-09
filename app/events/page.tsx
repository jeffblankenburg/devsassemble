import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { EventCard } from "@/components/events/event-card";
import { CalendarSubscribe } from "@/components/events/calendar-subscribe";
import { EventFilters, type EventFormat } from "@/components/events/event-filters";
import { NearMeControl } from "@/components/events/near-me-control";
import { ComicButton } from "@/components/brand/comic-button";
import { haversineMiles, NEARBY_RADII, DEFAULT_RADIUS } from "@/lib/events/geo";
import {
  listPublishedEvents,
  getUserRsvpMap,
  rsvpKey,
  type EventRow,
} from "@/lib/events/queries";
import { getSessionUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Upcoming and past DevsAssemble events — meetups, workshops, conferences, and livestreams. Browse freely; sign in to RSVP.",
};

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rotate-[-2deg] rounded-md border-ink bg-brand-lime px-3 py-1 font-display text-lg uppercase tracking-wide text-brand-ink shadow-comic-sm">
      {children}
    </span>
  );
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    format?: string;
    near?: string;
    lat?: string;
    lng?: string;
    radius?: string;
  }>;
}) {
  const { format: fmtParam, near, lat, lng, radius: radiusParam } =
    await searchParams;
  const format: EventFormat =
    fmtParam === "virtual" || fmtParam === "in-person" ? fmtParam : "all";

  const nearActive =
    format === "in-person" &&
    near === "1" &&
    !!lat &&
    !!lng &&
    !Number.isNaN(Number(lat)) &&
    !Number.isNaN(Number(lng));
  const radius = (NEARBY_RADII as readonly number[]).includes(Number(radiusParam))
    ? Number(radiusParam)
    : DEFAULT_RADIUS;

  const [upcomingAll, pastAll, user] = await Promise.all([
    listPublishedEvents({ when: "upcoming" }),
    listPublishedEvents({ when: "past", limit: 12 }),
    getSessionUser(),
  ]);

  const matchesFormat = (e: EventRow) =>
    format === "all" || (format === "virtual" ? e.is_virtual : !e.is_virtual);

  const within = (e: EventRow) => {
    if (!nearActive) return true;
    if (e.latitude == null || e.longitude == null) return false;
    return (
      haversineMiles(Number(lat), Number(lng), e.latitude, e.longitude) <= radius
    );
  };

  const upcoming = upcomingAll.filter((e) => matchesFormat(e) && within(e));
  const past = pastAll.filter((e) => matchesFormat(e) && within(e));

  const rsvpMap = user
    ? await getUserRsvpMap(
        user.id,
        upcoming.map((e) => ({ eventId: e.id, occurrenceStart: e.starts_at })),
      )
    : {};
  const rsvpFor = (event: EventRow) => ({
    currentStatus: rsvpMap[rsvpKey(event.id, event.starts_at)] ?? null,
    isAuthed: Boolean(user),
    loginHref: "/login?next=/events",
  });

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3">
            <Eyebrow>Upcoming events</Eyebrow>
            <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink sm:text-6xl">
              Assemble every week
            </h1>
            <p className="max-w-2xl text-brand-ink/75">
              Meetups, workshops, conferences, and livestreams from the
              community. Browsing is open to all — sign in to RSVP.
            </p>
          </div>
          <ComicButton href="/events/new" variant="lime" className="shrink-0">
            + Submit an event
          </ComicButton>
        </header>

        <div className="mt-8">
          <CalendarSubscribe />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <EventFilters active={format} />
          {format === "in-person" && (
            <NearMeControl
              active={nearActive}
              lat={lat}
              lng={lng}
              radius={radius}
            />
          )}
        </div>

        <section className="mt-10">
          {upcoming.length > 0 ? (
            <div className="grid gap-4">
              {upcoming.map((event) => (
                <EventCard
                  key={event.occurrenceKey ?? event.id}
                  event={event}
                  rsvp={rsvpFor(event)}
                />
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
                <EventCard key={event.occurrenceKey ?? event.id} event={event} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
