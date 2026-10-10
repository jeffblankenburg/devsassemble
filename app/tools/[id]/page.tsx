import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ToolCard } from "@/components/tools/tool-card";
import { getTool } from "@/lib/tools/queries";
import { getSessionUser } from "@/lib/auth/dal";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tool = await getTool(id);
  if (!tool) return { title: "Tool not found" };
  return {
    title: tool.name,
    description:
      tool.description ?? `A tool recommended by the DevsAssemble community.`,
  };
}

export default async function ToolDetailPage({ params }: Props) {
  const { id } = await params;
  const [tool, user] = await Promise.all([getTool(id), getSessionUser()]);
  if (!tool) notFound();

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <Link
          href="/tools"
          className="focus-comic text-sm text-brand-ink/70 hover:text-brand-blue"
        >
          ← All tools
        </Link>
        <div className="mt-4">
          <ToolCard
            tool={tool}
            isAuthed={Boolean(user)}
            loginHref={`/login?next=/tools/${id}`}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
