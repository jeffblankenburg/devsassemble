import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
        Welcome, {user.displayName ?? user.username ?? "dev"}
      </h1>
      <p className="mt-2 text-brand-ink/70">
        You&apos;re assembled. Here&apos;s where your builds, discussions, and
        upcoming meetups will live.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/projects/new"
          className="rounded-[var(--radius-comic)] border-ink bg-brand-blue p-5 font-display text-xl uppercase text-white shadow-comic hover:-translate-y-0.5"
        >
          Add a project
        </Link>
        <Link
          href="/discussions/new"
          className="rounded-[var(--radius-comic)] border-ink bg-brand-lime p-5 font-display text-xl uppercase text-brand-ink shadow-comic hover:-translate-y-0.5"
        >
          Start a discussion
        </Link>
        <Link
          href="/settings/profile"
          className="rounded-[var(--radius-comic)] border-ink bg-surface p-5 font-display text-xl uppercase text-brand-ink shadow-comic hover:-translate-y-0.5"
        >
          Edit your profile
        </Link>
      </div>
    </main>
  );
}
