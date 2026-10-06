import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RepoCard } from "@/components/repos/repo-card";
import { ComicButton } from "@/components/brand/comic-button";
import { listRepos, type RepoKind } from "@/lib/repos/queries";
import { getSessionUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "GitHub repos the DevsAssemble community has built and recommends. Browse freely; sign in to add one or react.",
};

type ProjectsPageProps = {
  searchParams: Promise<{ sort?: string; kind?: string }>;
};

function buildHref(sort: string, kind?: string) {
  const p = new URLSearchParams();
  if (sort === "top") p.set("sort", "top");
  if (kind) p.set("kind", kind);
  const qs = p.toString();
  return qs ? `/projects?${qs}` : "/projects";
}

function chip(active: boolean) {
  return `focus-comic rounded-md border-ink px-3 py-1 font-display text-sm uppercase tracking-wide shadow-comic-sm ${
    active ? "bg-brand-ink text-white" : "bg-surface text-brand-ink"
  }`;
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const { sort, kind } = await searchParams;
  const sortMode = sort === "top" ? "top" : "new";
  const kindFilter: RepoKind | undefined =
    kind === "build" || kind === "recommendation" ? kind : undefined;

  const [repos, user] = await Promise.all([
    listRepos({ sort: sortMode, kind: kindFilter }),
    getSessionUser(),
  ]);

  const newHref = user ? "/projects/new" : "/login?next=/projects/new";
  const loginHref = "/login?next=/projects";

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
            Projects
          </h1>
          <ComicButton href={newHref} variant="blue">
            Add a project
          </ComicButton>
        </div>
        <p className="mt-2 max-w-2xl text-brand-ink/75">
          Repos the community has built and recommends. Browse freely — sign in
          to add one or react.
        </p>

        <nav className="mt-6 flex flex-wrap items-center gap-2" aria-label="Filter">
          <Link href={buildHref(sortMode)} className={chip(!kindFilter)}>
            All
          </Link>
          <Link
            href={buildHref(sortMode, "build")}
            className={chip(kindFilter === "build")}
          >
            Builds
          </Link>
          <Link
            href={buildHref(sortMode, "recommendation")}
            className={chip(kindFilter === "recommendation")}
          >
            Picks
          </Link>
          <span className="mx-1 h-5 w-[2px] bg-brand-ink/15" aria-hidden />
          <Link
            href={buildHref("new", kindFilter)}
            className={chip(sortMode === "new")}
          >
            Newest
          </Link>
          <Link
            href={buildHref("top", kindFilter)}
            className={chip(sortMode === "top")}
          >
            Most loved
          </Link>
        </nav>

        {repos.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {repos.map((repo) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                isAuthed={Boolean(user)}
                loginHref={loginHref}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-10 text-center shadow-comic">
            <p className="font-display text-2xl uppercase tracking-wide text-brand-ink">
              No projects yet
            </p>
            <p className="mt-2 text-brand-ink/70">
              Be the first — share a repo you built or a tool you love.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
