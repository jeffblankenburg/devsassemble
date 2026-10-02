import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser } from "@/lib/auth/dal";
import { safeNext } from "@/lib/auth/redirects";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next: nextParam } = await searchParams;
  const next = safeNext(typeof nextParam === "string" ? nextParam : undefined);

  // Already signed in? Honor the intended destination.
  const user = await getSessionUser();
  if (user) redirect(next);

  const initialError = typeof error === "string" ? error : undefined;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <Logo priority />
      <LoginForm initialError={initialError} next={next} />
    </main>
  );
}
