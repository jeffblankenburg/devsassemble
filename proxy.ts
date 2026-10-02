import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 Proxy (formerly `middleware`). Runs on the Node.js runtime.
 * Responsibility here is intentionally narrow: refresh the Supabase session
 * and sync auth cookies. Security headers/CSP are applied in `next.config.ts`,
 * and route authorization happens in the DAL close to the data.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and image files, so auth cookies
     * stay fresh on navigations without blocking CSS/JS/images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
