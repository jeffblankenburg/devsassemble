import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SubmitToolForm } from "@/components/tools/submit-tool-form";
import { getSessionUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Add a tool" };

export default async function NewToolPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/tools/new");
  if (user.isBanned) redirect("/banned");

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="font-display text-4xl uppercase tracking-wide text-brand-ink">
          Add a tool
        </h1>
        <p className="mt-2 text-brand-ink/70">
          Share a tool or service you reach for — no GitHub repo required.
        </p>
        <div className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
          <SubmitToolForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
