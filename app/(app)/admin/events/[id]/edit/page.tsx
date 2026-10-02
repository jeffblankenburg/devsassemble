import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getEventById } from "@/lib/events/queries";
import { EventForm } from "@/components/admin/event-form";

export const metadata: Metadata = { title: "Edit event" };

// Inline param type — see docs/DECISIONS.md (generated route types unavailable here).
type EditEventPageProps = { params: Promise<{ id: string }> };

export default async function EditEventPage({ params }: EditEventPageProps) {
  await requireAdmin();
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-4xl uppercase tracking-wide text-brand-ink">
        Edit event
      </h1>
      <p className="mt-2 text-brand-ink/70">{event.title}</p>
      <div className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
        <EventForm mode="edit" event={event} />
      </div>
    </main>
  );
}
