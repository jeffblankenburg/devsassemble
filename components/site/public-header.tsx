import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ComicButton } from "@/components/brand/comic-button";
import { MobileNav } from "@/components/site/mobile-nav";
import { AppHeader } from "@/components/app/app-header";
import { getSessionUser } from "@/lib/auth/dal";

const NAV = [
  { href: "/events", label: "Events" },
  { href: "/projects", label: "Projects" },
  { href: "/tools", label: "Tools" },
  { href: "/discussions", label: "Discussions" },
];

/** Public site header for no-auth pages (events, profiles, …). */
export async function PublicHeader() {
  const user = await getSessionUser();

  // Signed-in visitors get the full authenticated nav everywhere, not the
  // generic public one.
  if (user) return <AppHeader user={user} />;

  return (
    <header className="sticky top-0 z-20 border-b-[3px] border-brand-ink bg-brand-cream/90 backdrop-blur supports-[backdrop-filter]:bg-brand-cream/75">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo priority />
        <div className="flex items-center gap-4">
          <nav
            aria-label="Primary"
            className="hidden items-center gap-6 md:flex"
          >
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
          <span className="hidden md:block">
            <ComicButton
              href={user ? "/dashboard" : "/login"}
              variant="lime"
            >
              {user ? "Dashboard" : "Sign in"}
            </ComicButton>
          </span>
          <MobileNav
            items={NAV}
            ctaHref={user ? "/dashboard" : "/login"}
            ctaLabel={user ? "Dashboard" : "Sign in"}
          />
        </div>
      </div>
    </header>
  );
}
