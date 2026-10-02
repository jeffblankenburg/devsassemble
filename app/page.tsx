import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { ComicButton } from "@/components/brand/comic-button";

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#events", label: "Events" },
  { href: "#showcase", label: "Showcase" },
  { href: "#community", label: "Community" },
];

// Honest, pre-launch trust framing — no fabricated user counts.
const TRUST = [
  { value: "100%", label: "Free to join" },
  { value: "Public", label: "By default — no gate to read" },
  { value: "Live", label: "Weekly build streams" },
  { value: "Open", label: "Repos, prompts & workflows" },
];

const STEPS = [
  {
    n: "01",
    accent: "bg-brand-blue text-white",
    title: "Show what you built",
    body: "Publish a build in minutes — link the repo, drop screenshots and a live demo. Everyone can see it; no account needed to browse.",
  },
  {
    n: "02",
    accent: "bg-brand-lime text-brand-ink",
    title: "Share how you did it",
    body: "Post the prompts, agents, and workflows behind the work. Threaded discussion means the good stuff gets refined in the open.",
  },
  {
    n: "03",
    accent: "bg-brand-purple text-white",
    title: "Assemble live",
    body: "RSVP to livestreamed meetups, watch together, and talk in real time while the code flies. Sign in when you're ready to join in.",
  },
];

const PILLARS = [
  {
    accent: "bg-brand-blue text-white",
    kicker: "Show",
    title: "Showcase your builds",
    body: "Publish what you've shipped — link the GitHub repo, drop screenshots and a live demo, and let the community react.",
  },
  {
    accent: "bg-brand-lime text-brand-ink",
    kicker: "Share",
    title: "Trade tools & strategies",
    body: "Threaded discussions on the prompts, agents, and workflows that actually work. Like, comment, and pass it on.",
  },
  {
    accent: "bg-brand-purple text-white",
    kicker: "Assemble",
    title: "Livestream meetups",
    body: "RSVP to livestreamed meetings, watch together, and chat in real time while the code flies.",
  },
];

const EVENTS = [
  {
    month: "OCT",
    day: "02",
    weekday: "Thu",
    time: "1:00 PM ET",
    title: "Ship-it Thursday: agents in production",
    host: "Live build stream",
    accent: "bg-brand-blue text-white",
  },
  {
    month: "OCT",
    day: "09",
    weekday: "Thu",
    time: "1:00 PM ET",
    title: "Prompt teardown — what actually moved the needle",
    host: "Community roundtable",
    accent: "bg-brand-lime text-brand-ink",
  },
  {
    month: "OCT",
    day: "16",
    weekday: "Thu",
    time: "1:00 PM ET",
    title: "From zero to demo: an app, live, in 60 minutes",
    host: "Live build stream",
    accent: "bg-brand-purple text-white",
  },
];

const BUILDS = [
  {
    title: "Inbox triage agent",
    blurb: "An LLM copilot that labels, drafts, and schedules — self-hosted.",
    tags: ["Next.js", "Claude", "MCP"],
    tint: "bg-brand-blue",
  },
  {
    title: "Repo-aware code reviewer",
    blurb: "Fans out subagents across a diff and posts inline findings.",
    tags: ["TypeScript", "Agents", "GitHub"],
    tint: "bg-brand-purple",
  },
  {
    title: "Voice-to-ticket pipeline",
    blurb: "Standups in, structured Linear issues out — zero copy-paste.",
    tags: ["Whisper", "Workflow", "Linear"],
    tint: "bg-brand-lime",
  },
];

// ---------------------------------------------------------------------------
// Local presentational pieces
// ---------------------------------------------------------------------------

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rotate-[-2deg] rounded-md border-ink bg-brand-lime px-3 py-1 font-display text-lg uppercase tracking-wide text-brand-ink shadow-comic-sm">
      {children}
    </span>
  );
}

function EventCard({ event }: { event: (typeof EVENTS)[number] }) {
  return (
    <article className="flex items-stretch gap-4 rounded-[var(--radius-comic)] border-ink bg-surface p-4 shadow-comic transition-transform duration-100 hover:-translate-y-0.5 hover:shadow-comic-lg">
      <div
        className={`flex w-20 shrink-0 flex-col items-center justify-center rounded-md border-ink ${event.accent} py-2 font-display leading-none`}
      >
        <span className="text-sm uppercase tracking-widest">
          {event.month}
        </span>
        <span className="text-4xl">{event.day}</span>
        <span className="text-xs uppercase opacity-90">{event.weekday}</span>
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          {event.time} · {event.host}
        </span>
        <h3 className="mt-1 font-display text-xl uppercase leading-tight tracking-wide text-brand-ink">
          {event.title}
        </h3>
      </div>
    </article>
  );
}

function BuildCard({ build }: { build: (typeof BUILDS)[number] }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-[var(--radius-comic)] border-ink bg-surface shadow-comic transition-transform duration-100 hover:-translate-y-1 hover:shadow-comic-lg">
      {/* Cover plate — a halftone-textured accent panel stands in for a screenshot. */}
      <div className={`halftone relative h-32 ${build.tint} border-b-[3px] border-brand-ink`}>
        <span className="absolute bottom-2 right-3 font-display text-sm uppercase tracking-widest text-white/80">
          Build
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-2xl uppercase leading-tight tracking-wide text-brand-ink">
          {build.title}
        </h3>
        <p className="mt-2 flex-1 text-sm text-brand-ink/75">{build.blurb}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {build.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-md border-[2px] border-brand-ink bg-brand-cream px-2 py-0.5 font-mono text-xs text-brand-ink"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b-[3px] border-brand-ink bg-brand-cream/90 backdrop-blur supports-[backdrop-filter]:bg-brand-cream/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo priority className="block" />
          <nav
            aria-label="Primary"
            className="hidden items-center gap-6 md:flex"
          >
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="focus-comic font-display text-lg uppercase tracking-wide text-brand-ink transition-colors hover:text-brand-blue"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <ComicButton href="/login" variant="lime">
            Sign in
          </ComicButton>
        </div>
      </header>

      <main id="main" className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="halftone relative overflow-hidden px-6 py-20 sm:py-28">
          {/* Floating comic bursts, decorative. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[6%] top-16 hidden rotate-[-8deg] rounded-[var(--radius-comic)] border-ink bg-brand-blue px-4 py-2 font-display text-lg uppercase text-white shadow-comic lg:block"
          >
            Show
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute right-[8%] top-28 hidden rotate-[7deg] rounded-[var(--radius-comic)] border-ink bg-brand-purple px-4 py-2 font-display text-lg uppercase text-white shadow-comic lg:block"
          >
            Share
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-10 left-[12%] hidden rotate-[5deg] rounded-[var(--radius-comic)] border-ink bg-brand-lime px-4 py-2 font-display text-lg uppercase text-brand-ink shadow-comic xl:block"
          >
            Assemble
          </div>

          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <span className="pop-in mb-6 inline-block rotate-[-2deg] rounded-[var(--radius-comic)] border-ink bg-brand-lime px-4 py-1 font-display text-xl uppercase tracking-wide text-brand-ink shadow-comic-sm">
              The AI dev community
            </span>
            <h1
              className="pop-in font-display text-6xl uppercase leading-[0.95] tracking-tight text-brand-ink sm:text-8xl"
              style={{ animationDelay: "80ms" }}
            >
              Devs,{" "}
              <span className="text-brand-blue text-stroke-ink">assemble</span>
            </h1>
            <p
              className="pop-in mt-6 max-w-2xl text-lg text-brand-ink/80 sm:text-xl"
              style={{ animationDelay: "160ms" }}
            >
              A place for AI software developers to show what they&apos;ve built,
              share the tools and strategies behind it, and assemble for
              livestreamed meetings.
            </p>
            <div
              className="pop-in mt-10 flex flex-col gap-4 sm:flex-row"
              style={{ animationDelay: "240ms" }}
            >
              <ComicButton href="/login" variant="blue" size="lg">
                Join the community
              </ComicButton>
              <ComicButton href="/events" variant="ink" size="lg">
                See upcoming events
              </ComicButton>
            </div>
            <p
              className="pop-in mt-4 font-mono text-xs uppercase tracking-widest text-muted"
              style={{ animationDelay: "320ms" }}
            >
              Free · Public to read · Sign in to post &amp; RSVP
            </p>
          </div>
        </section>

        {/* Trust strip */}
        <section
          aria-label="Why DevsAssemble"
          className="border-y-[3px] border-brand-ink bg-brand-ink"
        >
          <ul className="mx-auto grid max-w-6xl grid-cols-2 divide-brand-cream/20 sm:grid-cols-4 sm:divide-x">
            {TRUST.map((item) => (
              <li
                key={item.label}
                className="flex flex-col items-center gap-1 px-4 py-6 text-center"
              >
                <span className="font-display text-4xl uppercase text-brand-lime">
                  {item.value}
                </span>
                <span className="text-sm text-brand-cream/80">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center text-center">
              <SectionEyebrow>How it works</SectionEyebrow>
              <h2 className="mt-4 font-display text-4xl uppercase tracking-wide text-brand-ink sm:text-5xl">
                Three moves. One community.
              </h2>
              <p className="mt-3 max-w-2xl text-brand-ink/75">
                Everything on DevsAssemble is public to read. Create an account
                only when you want to post, react, comment, or RSVP.
              </p>
            </div>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="relative flex flex-col rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic"
                >
                  <span
                    className={`absolute -top-4 -left-4 flex h-12 w-12 items-center justify-center rounded-full border-ink ${step.accent} font-display text-xl shadow-comic-sm`}
                  >
                    {step.n}
                  </span>
                  <h3 className="mt-4 font-display text-2xl uppercase tracking-wide text-brand-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-brand-ink/75">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What you'll find (pillars) */}
        <section className="action-lines border-y-[3px] border-brand-ink px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-center text-center">
              <SectionEyebrow>What you&apos;ll find</SectionEyebrow>
              <h2 className="mt-4 font-display text-4xl uppercase tracking-wide text-brand-ink sm:text-5xl">
                Built for people who ship
              </h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {PILLARS.map((p) => (
                <article
                  key={p.kicker}
                  className="flex flex-col rounded-[var(--radius-comic)] border-ink bg-surface p-6 shadow-comic"
                >
                  <span
                    className={`mb-4 inline-block w-fit rounded-md border-ink px-3 py-1 font-display text-lg uppercase ${p.accent}`}
                  >
                    {p.kicker}
                  </span>
                  <h3 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-brand-ink/75">{p.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming events */}
        <section id="events" className="scroll-mt-24 px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-end justify-between gap-6 sm:flex-row">
              <div>
                <SectionEyebrow>Upcoming livestreams</SectionEyebrow>
                <h2 className="mt-4 font-display text-4xl uppercase tracking-wide text-brand-ink sm:text-5xl">
                  Assemble every week
                </h2>
                <p className="mt-3 max-w-xl text-brand-ink/75">
                  Watch builds happen live, ask questions in chat, and meet the
                  people behind the tools. Browsing is open to all.
                </p>
              </div>
              <ComicButton href="/events" variant="purple">
                Browse all events
              </ComicButton>
            </div>
            <div className="mt-10 grid gap-4">
              {EVENTS.map((event) => (
                <EventCard key={event.day} event={event} />
              ))}
            </div>
            <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted">
              Sign in to RSVP and get a reminder.
            </p>
          </div>
        </section>

        {/* Showcase preview */}
        <section
          id="showcase"
          className="halftone scroll-mt-24 border-y-[3px] border-brand-ink px-6 py-20 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-end justify-between gap-6 sm:flex-row">
              <div>
                <SectionEyebrow>The showcase</SectionEyebrow>
                <h2 className="mt-4 font-display text-4xl uppercase tracking-wide text-brand-ink sm:text-5xl">
                  See what devs are shipping
                </h2>
                <p className="mt-3 max-w-xl text-brand-ink/75">
                  Real builds with real repos. Screenshots, demos, and the story
                  behind each one.
                </p>
              </div>
              <ComicButton href="/showcase" variant="blue">
                Explore the showcase
              </ComicButton>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {BUILDS.map((build) => (
                <BuildCard key={build.title} build={build} />
              ))}
            </div>
          </div>
        </section>

        {/* Community band / CTA */}
        <section id="community" className="scroll-mt-24 px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-4xl">
            <div className="relative overflow-hidden rounded-[var(--radius-comic)] border-ink bg-brand-blue px-6 py-14 text-center shadow-comic-lg sm:px-12">
              <div className="action-lines pointer-events-none absolute inset-0 opacity-40" aria-hidden />
              <div className="relative">
                <h2 className="font-display text-4xl uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">
                  Ready to{" "}
                  <span className="text-brand-lime text-stroke-ink">
                    assemble?
                  </span>
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
                  Join a community of AI developers shipping in the open. It&apos;s
                  free, and you can start by just looking around.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <ComicButton href="/login" variant="lime" size="lg">
                    Create your account
                  </ComicButton>
                  <ComicButton href="/showcase" variant="ink" size="lg">
                    Browse first
                  </ComicButton>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-[3px] border-brand-ink bg-brand-cream px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Logo variant="icon" />
            <p className="max-w-xs text-sm text-brand-ink/70">
              Where AI software developers assemble to show, share, and ship in
              the open.
            </p>
          </div>
          <nav aria-label="Explore" className="flex flex-col gap-3">
            <h2 className="font-display text-lg uppercase tracking-wide text-brand-ink">
              Explore
            </h2>
            <a href="#showcase" className="focus-comic text-sm text-brand-ink/75 hover:text-brand-blue">
              Showcase
            </a>
            <a href="#events" className="focus-comic text-sm text-brand-ink/75 hover:text-brand-blue">
              Events
            </a>
            <a href="#how" className="focus-comic text-sm text-brand-ink/75 hover:text-brand-blue">
              How it works
            </a>
          </nav>
          <nav aria-label="Community" className="flex flex-col gap-3">
            <h2 className="font-display text-lg uppercase tracking-wide text-brand-ink">
              Community
            </h2>
            <a href="#community" className="focus-comic text-sm text-brand-ink/75 hover:text-brand-blue">
              About
            </a>
            <a href="/login" className="focus-comic text-sm text-brand-ink/75 hover:text-brand-blue">
              Sign in
            </a>
            <a href="/login" className="focus-comic text-sm text-brand-ink/75 hover:text-brand-blue">
              Create account
            </a>
          </nav>
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-lg uppercase tracking-wide text-brand-ink">
              Get started
            </h2>
            <p className="text-sm text-brand-ink/70">
              Free to join. Public to read.
            </p>
            <ComicButton href="/login" variant="blue">
              Join now
            </ComicButton>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl items-center justify-between border-t border-brand-ink/15 pt-6">
          <p className="text-sm text-brand-ink/60">
            © {new Date().getFullYear()} DevsAssemble
          </p>
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            devsassemble.ai
          </p>
        </div>
      </footer>
    </div>
  );
}
