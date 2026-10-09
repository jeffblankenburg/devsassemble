import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  title: "About",
  description:
    "DevsAssemble is a community for AI software developers to show what they've built, share the tools and strategies behind it, and assemble for events.",
};

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rotate-[-2deg] rounded-md border-ink bg-brand-lime px-3 py-1 font-display text-lg uppercase tracking-wide text-brand-ink shadow-comic-sm">
      {children}
    </span>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic">
      <h3 className="font-display text-xl uppercase tracking-wide text-brand-ink">
        {title}
      </h3>
      <p className="mt-2 text-brand-ink/80">{children}</p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <header className="flex flex-col gap-3">
          <Eyebrow>The AI dev community</Eyebrow>
          <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink sm:text-6xl">
            About DevsAssemble
          </h1>
          <p className="max-w-2xl text-lg text-brand-ink/80">
            DevsAssemble is a community for AI software developers to show what
            they&apos;ve built, share the tools and strategies behind it, and
            assemble for livestreamed meetings and in-person meetups.
          </p>
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <Card title="Show your builds">
            Share the projects you&apos;re shipping with AI — from weekend
            experiments to production tools — and see what everyone else is
            making.
          </Card>
          <Card title="Share what works">
            The tools, prompts, and workflows that actually move the needle,
            recommended by builders who use them.
          </Card>
          <Card title="Talk shop">
            Open discussions on building with AI — ask questions, compare notes,
            and help each other get unstuck.
          </Card>
          <Card title="Assemble">
            Livestreamed build sessions, workshops, conferences, and local
            meetups — browse the calendar and RSVP.
          </Card>
        </section>

        <section className="mt-10 rounded-[var(--radius-comic)] border-ink bg-brand-cream p-6 shadow-comic">
          <h2 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
            Free &amp; open
          </h2>
          <p className="mt-2 text-brand-ink/80">
            Everything here is public to read — no account needed to browse
            projects, tools, discussions, or events. Sign in with GitHub when
            you want to post, comment, RSVP, or submit an event.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { href: "/events", label: "Events" },
              { href: "/projects", label: "Projects" },
              { href: "/tools", label: "Tools" },
              { href: "/discussions", label: "Discussions" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="focus-comic rounded-md border-ink bg-surface px-4 py-1.5 font-display text-sm uppercase tracking-wide text-brand-ink shadow-comic-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-lime"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <p className="text-brand-ink/70">
            Follow along on{" "}
            <a
              href="https://x.com/devsassembleAI"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-comic text-brand-blue underline"
            >
              X
            </a>{" "}
            and{" "}
            <a
              href="https://bsky.app/profile/devsassemble.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-comic text-brand-blue underline"
            >
              Bluesky
            </a>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
