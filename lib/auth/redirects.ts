/**
 * Validate a post-auth `next` destination to prevent open-redirect attacks.
 * Only same-origin, absolute paths are allowed (must start with a single "/").
 */
export function safeNext(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback;
  // Must be a root-relative path, and not a protocol-relative "//evil.com"
  // or a backslash trick "/\\evil.com".
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
