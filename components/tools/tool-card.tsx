import Image from "next/image";
import Link from "next/link";
import { ToolReactionBar } from "./tool-reaction-bar";
import type { ToolItem } from "@/lib/tools/queries";
import { toolCategoryLabel } from "@/lib/tools/categories";

function hostAndFavicon(url: string): { host: string; favicon: string | null } {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return {
      host,
      favicon: `https://icons.duckduckgo.com/ip3/${host}.ico`,
    };
  } catch {
    return { host: url, favicon: null };
  }
}

export function ToolCard({
  tool,
  isAuthed,
  loginHref,
}: {
  tool: ToolItem;
  isAuthed: boolean;
  loginHref: string;
}) {
  const { host, favicon } = hostAndFavicon(tool.url);
  const detailHref = `/tools/${tool.id}`;
  const pill =
    "focus-comic inline-flex shrink-0 items-center gap-1 rounded-md border-[2px] border-brand-ink bg-surface px-3 py-1 font-display text-sm uppercase tracking-wide text-brand-ink shadow-comic-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-lime";

  return (
    <article className="flex flex-col rounded-[var(--radius-comic)] border-ink bg-surface p-5 shadow-comic">
      <div className="flex items-start gap-3">
        {favicon ? (
          <Image
            src={favicon}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="h-10 w-10 rounded-md border-[2px] border-brand-ink bg-white object-contain p-1"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-md border-[2px] border-brand-ink bg-brand-cream font-display text-brand-ink">
            {tool.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border-[2px] border-brand-ink bg-brand-purple px-2 py-0.5 font-display text-xs uppercase text-white">
              {toolCategoryLabel(tool.category)}
            </span>
          </div>
          <Link
            href={detailHref}
            className="focus-comic mt-1 block truncate font-display text-xl uppercase tracking-wide text-brand-ink hover:text-brand-blue"
          >
            {tool.name}
          </Link>
          <span className="block truncate font-mono text-xs text-muted">
            {host}
          </span>
        </div>
      </div>

      {tool.description && (
        <p className="mt-3 rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-2 text-sm text-brand-ink/85">
          “{tool.description}”
        </p>
      )}

      <div className="mt-3 font-mono text-xs text-muted">
        shared by{" "}
        {tool.submitter?.username ? (
          <Link
            href={`/u/${tool.submitter.username}`}
            className="focus-comic hover:underline"
          >
            @{tool.submitter.username}
          </Link>
        ) : (
          "a member"
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <ToolReactionBar
          toolId={tool.id}
          reactions={tool.reactions}
          myReactions={tool.myReactions}
          isAuthed={isAuthed}
          loginHref={loginHref}
        />
        <div className="flex items-center gap-2">
          <a
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className={pill}
          >
            Visit ↗
          </a>
          <Link href={`${detailHref}#discussion`} className={pill}>
            💬 Discuss
          </Link>
        </div>
      </div>
    </article>
  );
}
