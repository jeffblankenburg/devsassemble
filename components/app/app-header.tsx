import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { MobileNav } from "@/components/site/mobile-nav";
import { signOut } from "@/lib/auth/actions";
import type { SessionUser } from "@/lib/auth/dal";

const NAV = [
  { href: "/projects", label: "Projects" },
  { href: "/tools", label: "Tools" },
  { href: "/discussions", label: "Discussions" },
  { href: "/events", label: "Events" },
];

/** Header for the authenticated app shell. */
export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="relative flex items-center justify-between border-b-[3px] border-brand-ink px-6 py-3">
      <div className="flex items-center gap-4">
        <MobileNav items={NAV} ctaHref="/dashboard" ctaLabel="Dashboard" />
        <Logo priority />
        <nav className="hidden gap-4 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-display text-lg uppercase tracking-wide text-brand-ink hover:text-brand-blue"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {user.role !== "member" && (
          <Link
            href="/admin"
            className="rounded-md border-ink bg-brand-purple px-3 py-1 font-display text-sm uppercase text-white shadow-comic-sm"
          >
            Admin
          </Link>
        )}
        <Link
          href="/settings/profile"
          className="font-display text-lg uppercase tracking-wide text-brand-ink hover:text-brand-blue"
        >
          {user.username ?? "Profile"}
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border-ink bg-white px-3 py-1 font-display text-sm uppercase text-brand-ink shadow-comic-sm hover:bg-brand-lime"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
