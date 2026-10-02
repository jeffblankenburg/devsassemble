import Image from "next/image";
import Link from "next/link";
import type { ForumAuthor } from "@/lib/forum/queries";

/** Avatar + handle. Renders a profile link unless `linked` is false. */
export function AuthorChip({
  author,
  size = 24,
  linked = true,
}: {
  author: ForumAuthor;
  size?: number;
  linked?: boolean;
}) {
  const name = author?.display_name ?? author?.username ?? "member";

  const inner = (
    <span className="inline-flex items-center gap-2">
      {author?.avatar_url ? (
        <Image
          src={author.avatar_url}
          alt={name}
          width={size}
          height={size}
          className="rounded-full border-[2px] border-brand-ink object-cover"
        />
      ) : (
        <span
          className="flex items-center justify-center rounded-full border-[2px] border-brand-ink bg-brand-lime font-display text-brand-ink"
          style={{ width: size, height: size }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="font-mono text-sm text-brand-ink">
        {author?.username ? `@${author.username}` : name}
      </span>
    </span>
  );

  if (linked && author?.username) {
    return (
      <Link href={`/u/${author.username}`} className="focus-comic hover:underline">
        {inner}
      </Link>
    );
  }
  return inner;
}
