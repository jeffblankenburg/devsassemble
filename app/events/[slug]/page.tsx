import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RsvpControls } from "@/components/events/rsvp-controls";
import { Attendees } from "@/components/events/attendees";
import { getSessionUser } from "@/lib/auth/dal";
import {
  getEventBySlug,
  getRsvpSummary,
  getAttendees,
  getUserRsvp,
  getEventOrganizer,
} from "@/lib/events/queries";
import {
  formatFullDate,
  formatTime,
  tzLabel,
  isEventOver,
} from "@/lib/events/format";
import {
  upcomingOccurrences,
  latestPastOccurrence,
} from "@/lib/events/recurrence";

// Inline param type (not PageProps<...>) so this doesn't depend on Next's
// generated route types, which can't be regenerated here. See docs/DECISIONS.md.
type EventPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.summary ?? undefined,
  };
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  // For a recurring series, show (and RSVP to) the next occurrence — or the
  // last one if the series has ended — rather than the stale base start.
  const now = new Date();
  const occurrence =
    upcomingOccurrences(event, now, 1)[0] ??
    latestPastOccurrence(event, now) ??
    event;
  const occStart = occurrence.starts_at;

  const user = await getSessionUser();
  const [summary, attendees, currentStatus, organizer] = await Promise.all([
    getRsvpSummary(event.id, occStart),
    getAttendees(event.id, occStart, { status: "going", limit: 24 }),
    user ? getUserRsvp(event.id, user.id, occStart) : Promise.resolve(null),
    event.created_by ? getEventOrganizer(event.created_by) : Promise.resolve(null),
  ]);

  const isAdmin = user?.role === "admin" || user?.role === "moderator";
  const canEdit = Boolean(user) && (isAdmin || event.created_by === user?.id);
  const organizerName = organizer?.display_name || organizer?.username;
  const isPast = isEventOver(occurrence);
  const isCancelled = occurrence.status === "cancelled";
  const loginHref = `/login?next=${encodeURIComponent(`/events/${event.slug}`)}`;

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        {isCancelled && (
          <div className="mb-6 rounded-[var(--radius-comic)] border-ink bg-brand-ink px-4 py-3 font-display text-lg uppercase tracking-wide text-white shadow-comic">
            This event has been cancelled.
          </div>
        )}

        {/* Live broadcast (Restream embed). Shown when a stream is attached. */}
        {event.is_live && event.stream_embed_url && !isCancelled && (
          <div className="mb-8">
            <span className="mb-2 inline-block rounded-md border-ink bg-brand-purple px-3 py-1 font-display text-sm uppercase tracking-wide text-white shadow-comic-sm">
              ● Live now
            </span>
            <div className="aspect-video w-full overflow-hidden rounded-[var(--radius-comic)] border-ink shadow-comic">
              <iframe
                src={event.stream_embed_url}
                title={`${event.title} — live stream`}
                allow="autoplay; fullscreen"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        )}

        <article>
          <p className="font-mono text-sm uppercase tracking-widest text-muted">
            {formatFullDate(occurrence.starts_at, event.timezone)} ·{" "}
            {formatTime(occurrence.starts_at, event.timezone)}{" "}
            {tzLabel(event.timezone)}
            {event.host ? ` · ${event.host}` : ""}
          </p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-[0.95] tracking-tight text-brand-ink sm:text-6xl">
            {event.title}
          </h1>

          {(organizerName || canEdit) && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-ink/60">
              {organizerName && (
                <span>
                  Organized by{" "}
                  {organizer?.username ? (
                    <a
                      href={`/u/${organizer.username}`}
                      className="focus-comic text-brand-blue hover:underline"
                    >
                      @{organizer.username}
                    </a>
                  ) : (
                    organizerName
                  )}
                </span>
              )}
              {canEdit && (
                <a
                  href={`/events/${event.slug}/edit`}
                  className="focus-comic font-mono text-xs uppercase tracking-widest text-brand-blue hover:underline"
                >
                  Edit event →
                </a>
              )}
            </p>
          )}

          <ul className="mt-4 flex flex-wrap gap-3 text-sm">
            <li className="rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-1 font-mono text-brand-ink">
              {event.is_virtual ? "Virtual" : "In person"}
            </li>
            {event.url && (
              <li>
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-comic rounded-md border-[2px] border-brand-ink bg-brand-blue px-3 py-1 font-mono text-white hover:-translate-y-0.5"
                >
                  {event.is_virtual ? "Join →" : "Website →"}
                </a>
              </li>
            )}
            {event.location && (
              <li>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    event.location,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-comic inline-flex items-center gap-1 rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-1 font-mono text-brand-ink hover:-translate-y-0.5 hover:bg-brand-lime"
                >
                  📍 {event.location}
                </a>
              </li>
            )}
            {summary.going > 0 && (
              <li className="rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-1 font-mono text-brand-ink">
                {summary.going} going
              </li>
            )}
            {summary.interested > 0 && (
              <li className="rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-1 font-mono text-brand-ink">
                {summary.interested} interested
              </li>
            )}
          </ul>

          <a
            href={`/events/${event.slug}/calendar.ics`}
            className="focus-comic mt-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-brand-blue hover:underline"
          >
            + Add to calendar
          </a>

          {event.description && (
            <div className="mt-8 whitespace-pre-wrap text-lg leading-relaxed text-brand-ink/85">
              {event.description}
            </div>
          )}
        </article>

        {/* RSVP */}
        <section className="mt-10 rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
          <h2 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
            {isPast ? "This event has ended" : event.rsvp_url ? "Register" : "RSVP"}
          </h2>
          <div className="mt-4">
            <RsvpControls
              eventId={event.id}
              slug={event.slug}
              occurrenceStart={occStart}
              currentStatus={currentStatus}
              isAuthed={Boolean(user)}
              loginHref={loginHref}
              disabled={isPast || isCancelled}
              externalRsvpUrl={event.rsvp_url}
            />
          </div>
        </section>

        {/* Who's going */}
        <section className="mt-10">
          <h2 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
            Who&apos;s going
          </h2>
          <div className="mt-4">
            <Attendees attendees={attendees} total={summary.going} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
