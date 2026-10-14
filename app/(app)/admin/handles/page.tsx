import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth/dal";
import { listSocialHandles } from "@/lib/social/queries";
import { HandleRegistry } from "@/components/admin/handle-registry";

export const metadata: Metadata = { title: "Handle registry" };

export default async function AdminHandlesPage() {
  await requireCapability("manage_social");
  const handles = await listSocialHandles();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
        Handle registry
      </h1>
      <p className="mt-2 text-brand-ink/70">
        Verified social handles the tweet drafter is allowed to @-mention — so
        the companies and products we talk about get notified and might reshare.
        Only verified handles are ever posted; the AI proposes new ones here for
        you to check and approve.
      </p>

      <HandleRegistry handles={handles} />
    </main>
  );
}
