import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ComicButton } from "@/components/brand/comic-button";
import { getSessionUser } from "@/lib/auth/dal";

const NAV = [
  { href: "/events", label: "Events" },
  { href: "/discussions", label: "Discussions" },
  { href: "/showcase", label: "Showcase" },
];

/** Public site header for no-auth pages (events, profiles, …). */
export async function PublicHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-20 border-b-[3px] border-brand-ink bg-brand-cream/90 backdrop-blur supports-[backdrop-filter]:bg-brand-cream/75">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-comic font-display text-lg uppercase tracking-wide text-brand-ink transition-colors hover:text-brand-blue"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {user ? (
          <ComicButton href="/dashboard" variant="lime">
            Dashboard
          </ComicButton>
        ) : (
          <ComicButton href="/login" variant="lime">
            Sign in
          </ComicButton>
        )}
      </div>
    </header>
  );
}
