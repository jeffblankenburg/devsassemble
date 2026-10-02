import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { EventForm } from "@/components/admin/event-form";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-4xl uppercase tracking-wide text-brand-ink">
        New event
      </h1>
      <p className="mt-2 text-brand-ink/70">
        Save as a draft first; publish when it&apos;s ready to go public.
      </p>
      <div className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
        <EventForm mode="create" />
      </div>
    </main>
  );
}
