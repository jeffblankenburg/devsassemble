import Link from "next/link";
import { SocialLinks } from "@/components/site/social-links";

/** Slim footer for interior public pages. */
export function SiteFooter() {
  return (
    <footer className="border-t-[3px] border-brand-ink bg-brand-cream px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-brand-ink/60">
          © {new Date().getFullYear()} DevsAssemble
        </p>
        <div className="flex items-center gap-4">
          <nav className="flex gap-4" aria-label="Footer">
            <Link
              href="/about"
              className="focus-comic text-sm text-brand-ink/75 hover:text-brand-blue"
            >
              About
            </Link>
            <Link
              href="/events"
              className="focus-comic text-sm text-brand-ink/75 hover:text-brand-blue"
            >
              Events
            </Link>
            <Link
              href="/feed"
              className="focus-comic text-sm text-brand-ink/75 hover:text-brand-blue"
            >
              Feed
            </Link>
            <Link
              href="/"
              className="focus-comic text-sm text-brand-ink/75 hover:text-brand-blue"
            >
              Home
            </Link>
            <Link
              href="/login"
              className="focus-comic text-sm text-brand-ink/75 hover:text-brand-blue"
            >
              Sign in
            </Link>
          </nav>
          <SocialLinks iconClassName="h-4 w-4" />
        </div>
      </div>
    </footer>
  );
}
