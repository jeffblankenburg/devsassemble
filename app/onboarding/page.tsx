import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/dal";
import { safeNext } from "@/lib/auth/redirects";
import { SurveyForm } from "@/components/survey/survey-form";

export const metadata: Metadata = { title: "Welcome — tell us about you" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { next } = await searchParams;
  // Already done? Don't trap them here.
  if (!user.needsOnboarding) redirect(safeNext(next));

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-brand-ink/50">
        Welcome, {user.displayName ?? user.username} 👋
      </p>
      <h1 className="mt-1 font-display text-4xl uppercase tracking-wide text-brand-ink sm:text-5xl">
        One quick thing
      </h1>
      <p className="mt-2 text-brand-ink/75">
        You&apos;re in! Before you dive in, tell us a little about yourself so we
        can shape DevsAssemble around the people actually here. Takes about 30
        seconds.
      </p>

      <div className="mt-8">
        <SurveyForm next={next} />
      </div>
    </main>
  );
}
