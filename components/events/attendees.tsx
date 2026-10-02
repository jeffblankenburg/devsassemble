import Image from "next/image";
import Link from "next/link";
import type { Attendee } from "@/lib/events/queries";

function initial(name: string | null, username: string | null) {
  return (name ?? username ?? "?").charAt(0).toUpperCase();
}

/** "Who's going" — avatar + handle grid, linking to public profiles. */
export function Attendees({
  attendees,
  total,
}: {
  attendees: Attendee[];
  total: number;
}) {
  if (total === 0) {
    return (
      <p className="text-brand-ink/60">
        No one&apos;s RSVP&apos;d yet — be the first to assemble.
      </p>
    );
  }

  const extra = total - attendees.length;

  return (
    <div>
      <ul className="flex flex-wrap gap-3">
        {attendees.map((a) => {
          const name = a.display_name ?? a.username ?? "member";
          const body = (
            <>
              {a.avatar_url ? (
                <Image
                  src={a.avatar_url}
                  alt={name}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full border-[2px] border-brand-ink object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full border-[2px] border-brand-ink bg-brand-lime font-display text-brand-ink">
                  {initial(a.display_name, a.username)}
                </span>
              )}
              <span className="font-mono text-sm text-brand-ink">
                {a.username ? `@${a.username}` : name}
              </span>
            </>
          );

          return (
            <li key={a.user_id}>
              {a.username ? (
                <Link
                  href={`/u/${a.username}`}
                  className="focus-comic flex items-center gap-2 rounded-full border-ink bg-surface py-1 pl-1 pr-3 shadow-comic-sm transition-transform hover:-translate-y-0.5"
                >
                  {body}
                </Link>
              ) : (
                <span className="flex items-center gap-2 rounded-full border-ink bg-surface py-1 pl-1 pr-3 shadow-comic-sm">
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {extra > 0 && (
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-muted">
          + {extra} more going
        </p>
      )}
    </div>
  );
}
