import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SubmitRepoForm } from "@/components/repos/submit-repo-form";
import { getSessionUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Add a project" };

export default async function NewProjectPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/projects/new");
  if (user.isBanned) redirect("/banned");

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="font-display text-4xl uppercase tracking-wide text-brand-ink">
          Add a project
        </h1>
        <p className="mt-2 text-brand-ink/70">
          Share a repo you built, or a tool/project you think is worth knowing.
        </p>
        <div className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
          <SubmitRepoForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
