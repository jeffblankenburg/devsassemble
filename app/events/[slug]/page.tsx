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
} from "@/lib/events/queries";
import {
  formatFullDate,
  formatTime,
  tzLabel,
  isEventOver,
} from "@/lib/events/format";

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

  const user = await getSessionUser();
  const [summary, attendees, currentStatus] = await Promise.all([
    getRsvpSummary(event.id),
    getAttendees(event.id, { status: "going", limit: 24 }),
    user ? getUserRsvp(event.id, user.id) : Promise.resolve(null),
  ]);

  const isPast = isEventOver(event);
  const isCancelled = event.status === "cancelled";
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
            {formatFullDate(event.starts_at)} · {formatTime(event.starts_at)}{" "}
            {tzLabel(event.timezone)}
            {event.host ? ` · ${event.host}` : ""}
          </p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-[0.95] tracking-tight text-brand-ink sm:text-6xl">
            {event.title}
          </h1>

          <ul className="mt-4 flex flex-wrap gap-3 text-sm">
            <li className="rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-1 font-mono text-brand-ink">
              {event.is_virtual ? "Virtual" : "In person"}
            </li>
            {event.location && (
              <li className="rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-1 font-mono text-brand-ink">
                {event.location}
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

          {event.description && (
            <div className="mt-8 whitespace-pre-wrap text-lg leading-relaxed text-brand-ink/85">
              {event.description}
            </div>
          )}
        </article>

        {/* RSVP */}
        <section className="mt-10 rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
          <h2 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
            {isPast ? "This event has ended" : "RSVP"}
          </h2>
          <div className="mt-4">
            <RsvpControls
              eventId={event.id}
              slug={event.slug}
              currentStatus={currentStatus}
              isAuthed={Boolean(user)}
              loginHref={loginHref}
              disabled={isPast || isCancelled}
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
