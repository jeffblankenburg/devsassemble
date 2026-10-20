import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, userCan } from "@/lib/auth/dal";
import type { Capability } from "@/lib/auth/capabilities";

export const metadata: Metadata = { title: "Admin" };

const SECTIONS: {
  href: string;
  title: string;
  body: string;
  accent: string;
  cap: Capability;
}[] = [
  {
    href: "/admin/users",
    title: "Users",
    body: "Assign admins and grant granular capabilities. Ban members.",
    accent: "bg-brand-ink text-white",
    cap: "manage_users",
  },
  {
    href: "/admin/events",
    title: "Events",
    body: "Create and manage livestreamed meetups. Only published events are public.",
    accent: "bg-brand-blue text-white",
    cap: "manage_events",
  },
  {
    href: "/admin/reports",
    title: "Reports",
    body: "Review flagged topics and replies. Resolve or dismiss moderation reports.",
    accent: "bg-brand-purple text-white",
    cap: "moderate",
  },
  {
    href: "/admin/feedback",
    title: "Feedback",
    body: "Read and triage feedback sent from the site's feedback widget.",
    accent: "bg-brand-cream text-brand-ink",
    cap: "manage_feedback",
  },
  {
    href: "/admin/news",
    title: "Captured news",
    body: "Browse the raw Reddit/dev-news feed captured via IFTTT.",
    accent: "bg-brand-ink text-white",
    cap: "manage_social",
  },
  {
    href: "/admin/survey",
    title: "Survey results",
    body: "Who's signing up: personas, tools, AI observability, and goals.",
    accent: "bg-brand-purple text-white",
    cap: "view_insights",
  },
  {
    href: "/admin/analytics",
    title: "Link analytics",
    body: "Clickthroughs on shared articles, videos, and links from discussions.",
    accent: "bg-brand-lime text-brand-ink",
    cap: "view_insights",
  },
  {
    href: "/admin/tweets",
    title: "Tweets",
    body: "Review @devsassembleAI drafts, edit, and cross-post to X + Bluesky.",
    accent: "bg-brand-lime text-brand-ink",
    cap: "manage_social",
  },
  {
    href: "/admin/handles",
    title: "Handle registry",
    body: "Verify social handles the drafter can @-mention for reach.",
    accent: "bg-brand-blue text-white",
    cap: "manage_social",
  },
];

export default async function AdminPage() {
  const user = await requireAdmin();
  const sections = SECTIONS.filter((s) => userCan(user, s.cap));

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
        Admin
      </h1>
      <p className="mt-2 text-brand-ink/70">Moderator & admin tools.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
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
