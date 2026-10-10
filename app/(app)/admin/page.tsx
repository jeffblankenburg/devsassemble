import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Admin" };

const SECTIONS = [
  {
    href: "/admin/events",
    title: "Events",
    body: "Create and manage livestreamed meetups. Only published events are public.",
    accent: "bg-brand-blue text-white",
  },
  {
    href: "/admin/reports",
    title: "Reports",
    body: "Review flagged topics and replies. Resolve or dismiss moderation reports.",
    accent: "bg-brand-purple text-white",
  },
  {
    href: "/admin/news",
    title: "Captured news",
    body: "Browse the raw Reddit/dev-news feed captured via IFTTT.",
    accent: "bg-brand-ink text-white",
  },
  {
    href: "/admin/survey",
    title: "Survey results",
    body: "Who's signing up: personas, tools, AI observability, and goals.",
    accent: "bg-brand-purple text-white",
  },
  {
    href: "/admin/tweets",
    title: "Tweets",
    body: "Review @devsassembleAI drafts, edit, and cross-post to X + Bluesky.",
    accent: "bg-brand-lime text-brand-ink",
  },
];

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
        Admin
      </h1>
      <p className="mt-2 text-brand-ink/70">Moderator & admin tools.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`rounded-[var(--radius-comic)] border-ink p-6 shadow-comic transition-transform hover:-translate-y-0.5 hover:shadow-comic-lg ${s.accent}`}
          >
            <h2 className="font-display text-2xl uppercase tracking-wide">
              {s.title}
            </h2>
            <p className="mt-1 text-sm opacity-90">{s.body}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
