import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ToolCard } from "@/components/tools/tool-card";
import { ComicButton } from "@/components/brand/comic-button";
import { listTools } from "@/lib/tools/queries";
import {
  TOOL_CATEGORIES,
  isToolCategory,
  type ToolCategory,
} from "@/lib/tools/categories";
import { getSessionUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "The DevsAssemble toolbelt — tools and services the community recommends. Browse freely; sign in to add one or react.",
};

type ToolsPageProps = {
  searchParams: Promise<{ sort?: string; category?: string }>;
};

function buildHref(sort: string, category?: string) {
  const p = new URLSearchParams();
  if (sort === "top") p.set("sort", "top");
  if (category) p.set("category", category);
  const qs = p.toString();
  return qs ? `/tools?${qs}` : "/tools";
}

function chip(active: boolean) {
  return `focus-comic rounded-md border-ink px-3 py-1 font-display text-sm uppercase tracking-wide shadow-comic-sm ${
    active ? "bg-brand-ink text-white" : "bg-surface text-brand-ink"
  }`;
}

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  const { sort, category } = await searchParams;
  const sortMode = sort === "top" ? "top" : "new";
  const categoryFilter: ToolCategory | undefined =
    category && isToolCategory(category) ? category : undefined;

  const [tools, user] = await Promise.all([
    listTools({ sort: sortMode, category: categoryFilter }),
    getSessionUser(),
  ]);

  const newHref = user ? "/tools/new" : "/login?next=/tools/new";
  const loginHref = "/login?next=/tools";

  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
            Tools
          </h1>
          <ComicButton href={newHref} variant="blue">
            Add a tool
          </ComicButton>
        </div>
        <p className="mt-2 max-w-2xl text-brand-ink/75">
          The community toolbelt — services and tools worth knowing, no repo
          required. Browse freely — sign in to add one or react.
        </p>

        <nav
          className="mt-6 flex flex-wrap items-center gap-2"
          aria-label="Filter"
        >
          <Link href={buildHref(sortMode)} className={chip(!categoryFilter)}>
            All
          </Link>
          {TOOL_CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={buildHref(sortMode, c.value)}
              className={chip(categoryFilter === c.value)}
            >
              {c.label}
            </Link>
          ))}
          <span className="mx-1 h-5 w-[2px] bg-brand-ink/15" aria-hidden />
          <Link
            href={buildHref("new", categoryFilter)}
            className={chip(sortMode === "new")}
          >
            Newest
          </Link>
          <Link
            href={buildHref("top", categoryFilter)}
            className={chip(sortMode === "top")}
          >
            Most loved
          </Link>
        </nav>

        {tools.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {tools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isAuthed={Boolean(user)}
                loginHref={loginHref}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[var(--radius-comic)] border-ink bg-surface p-10 text-center shadow-comic">
            <p className="font-display text-2xl uppercase tracking-wide text-brand-ink">
              {categoryFilter ? "No tools here yet" : "No tools yet"}
            </p>
            <p className="mt-2 text-brand-ink/70">
              Be the first — share a tool you reach for all the time.
            </p>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
