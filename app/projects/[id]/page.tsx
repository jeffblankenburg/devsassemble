import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RepoCard } from "@/components/repos/repo-card";
import { getRepo } from "@/lib/repos/queries";
import { getSessionUser } from "@/lib/auth/dal";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const repo = await getRepo(id);
  if (!repo) return { title: "Project not found" };
  return {
    title: `${repo.owner}/${repo.name}`,
    description:
      repo.description ?? `A project shared by the DevsAssemble community.`,
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const [repo, user] = await Promise.all([getRepo(id), getSessionUser()]);
  if (!repo) notFound();

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <Link
          href="/projects"
          className="focus-comic text-sm text-brand-ink/70 hover:text-brand-blue"
        >
          ← All projects
        </Link>
        <div className="mt-4">
          <RepoCard
            repo={repo}
            isAuthed={Boolean(user)}
            loginHref={`/login?next=/projects/${id}`}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
