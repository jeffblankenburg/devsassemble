import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { EventForm } from "@/components/admin/event-form";
import { getSessionUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Submit an event" };

export default async function SubmitEventPage() {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/events/new")}`);
  const isAdmin = user.role === "admin" || user.role === "moderator";

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
          Submit an event
        </h1>
        <p className="mt-2 text-brand-ink/70">
          Share a meetup, workshop, or stream with the community.{" "}
          {isAdmin
            ? "Save as a draft or publish."
            : "It goes live right away — you can edit or cancel it anytime."}
        </p>
        <div className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
          <EventForm mode="create" canAdmin={isAdmin} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
