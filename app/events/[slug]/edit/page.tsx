import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { EventForm } from "@/components/admin/event-form";
import { OccurrenceManager } from "@/components/admin/occurrence-manager";
import { getEventBySlug } from "@/lib/events/queries";
import { getSessionUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Edit event" };

type EditEventPageProps = { params: Promise<{ slug: string }> };

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/events/${slug}/edit`)}`);

  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const isAdmin = user.role === "admin" || user.role === "moderator";
  const isOwner = event.created_by === user.id;
  if (!isAdmin && !isOwner) redirect(`/events/${slug}`);

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
          Edit event
        </h1>
        <p className="mt-2 text-brand-ink/70">{event.title}</p>
        <div className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
          <EventForm mode="edit" event={event} canAdmin={isAdmin} />
        </div>
        <OccurrenceManager event={event} />
      </main>
      <SiteFooter />
    </>
  );
}
