import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { NewTopicForm } from "@/components/forum/new-topic-form";
import { getSessionUser } from "@/lib/auth/dal";
import { listCategories } from "@/lib/forum/queries";

export const metadata: Metadata = { title: "New discussion" };

export default async function NewDiscussionPage() {
  // Funnel: send guests to sign in and return here.
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/discussions/new");
  if (user.isBanned) redirect("/banned");

  const categories = await listCategories();

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="font-display text-4xl uppercase tracking-wide text-brand-ink">
          Start a discussion
        </h1>
        <p className="mt-2 text-brand-ink/70">
          Markdown is supported. Be excellent to each other.
        </p>
        <div className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
          <NewTopicForm categories={categories} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
