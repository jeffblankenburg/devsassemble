import { requireUser } from "@/lib/auth/dal";
import { AppHeader } from "@/components/app/app-header";

/**
 * Authenticated app shell. `requireUser()` runs in the DAL (cached) and
 * redirects unauthenticated visitors to /login. Individual pages also call
 * requireUser/requireAdmin so protection never relies on the layout alone
 * (see Next.js 16 auth guidance on partial rendering).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader user={user} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
