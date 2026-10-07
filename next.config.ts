import type { NextConfig } from "next";

// Baseline security headers. A strict, nonce-based Content-Security-Policy is
// added in M2 (needs per-request nonce injection); these apply to every route
// now. See the build plan's Security checklist.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // GitHub avatars for member profiles.
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // Supabase Storage (project-media, event covers). Host is env-driven at
      // deploy time; the wildcard covers any Supabase project subdomain.
      { protocol: "https", hostname: "*.supabase.co" },
      // Favicons for recommended tools (returns a default icon for unknowns).
      { protocol: "https", hostname: "icons.duckduckgo.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
