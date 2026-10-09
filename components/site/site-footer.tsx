import Link from "next/link";

/** Slim footer for interior public pages. */
export function SiteFooter() {
  return (
    <footer className="border-t-[3px] border-brand-ink bg-brand-cream px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-brand-ink/60">
          © {new Date().getFullYear()} DevsAssemble
        </p>
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
          <a
            href="https://x.com/devsassembleAI"
            target="_blank"
            rel="noopener noreferrer"
            className="focus-comic text-sm text-brand-ink/75 hover:text-brand-blue"
          >
            @devsassembleAI
          </a>
        </nav>
      </div>
    </footer>
  );
}
