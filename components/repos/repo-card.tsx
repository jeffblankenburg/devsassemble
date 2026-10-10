import Image from "next/image";
import Link from "next/link";
import { ReactionBar } from "./reaction-bar";
import type { RepoItem } from "@/lib/repos/queries";

export function RepoCard({
  repo,
  isAuthed,
  loginHref,
}: {
  repo: RepoItem;
  isAuthed: boolean;
  loginHref: string;
}) {
  const detailHref = `/projects/${repo.id}`;
  const pill =
    "focus-comic inline-flex shrink-0 items-center gap-1 rounded-md border-[2px] border-brand-ink bg-surface px-3 py-1 font-display text-sm uppercase tracking-wide text-brand-ink shadow-comic-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-lime";

  return (
    <article className="flex flex-col rounded-[var(--radius-comic)] border-ink bg-surface p-5 shadow-comic">
      <div className="flex items-start gap-3">
        {repo.owner_avatar_url ? (
          <Image
            src={repo.owner_avatar_url}
            alt={repo.owner}
            width={40}
            height={40}
            className="h-10 w-10 rounded-md border-[2px] border-brand-ink object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-md border-[2px] border-brand-ink bg-brand-cream font-display text-brand-ink">
            {repo.owner.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {repo.language && (
              <span className="font-mono text-xs text-muted">
                {repo.language}
              </span>
            )}
            {typeof repo.stars === "number" && (
              <span className="font-mono text-xs text-muted">★ {repo.stars}</span>
            )}
          </div>
          <Link
            href={detailHref}
            className="focus-comic mt-1 block truncate font-display text-xl uppercase tracking-wide text-brand-ink hover:text-brand-blue"
          >
            {repo.owner}/{repo.name}
          </Link>
          {repo.description && (
            <p className="mt-1 line-clamp-2 text-sm text-brand-ink/75">
              {repo.description}
            </p>
          )}
        </div>
      </div>

      {repo.note && (
        <p className="mt-3 rounded-md border-[2px] border-brand-ink bg-brand-cream px-3 py-2 text-sm text-brand-ink/85">
          “{repo.note}”
        </p>
      )}

      <div className="mt-3 font-mono text-xs text-muted">
        shared by{" "}
        {repo.submitter?.username ? (
          <Link
            href={`/u/${repo.submitter.username}`}
            className="focus-comic hover:underline"
          >
            @{repo.submitter.username}
          </Link>
        ) : (
          "a member"
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <ReactionBar
          repoId={repo.id}
          reactions={repo.reactions}
          myReactions={repo.myReactions}
          isAuthed={isAuthed}
          loginHref={loginHref}
        />
        <div className="flex items-center gap-2">
          <a
            href={repo.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className={pill}
          >
            GitHub ↗
          </a>
          <Link href={`${detailHref}#discussion`} className={pill}>
            💬 Discuss
          </Link>
        </div>
      </div>
    </article>
  );
}
