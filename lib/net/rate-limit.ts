import "server-only";

/**
 * Dead-simple fixed-window rate limiter, keyed by an arbitrary string (e.g.
 * `link-preview:<userId>`). Used to cap how often a member can trigger a live
 * link unfurl from the composer — the SSRF guard in safeFetch is the real
 * protection; this just stops someone pointing our server at a target in a
 * tight loop.
 *
 * Caveat: state is in-memory and therefore PER INSTANCE. On Fluid Compute an
 * attacker spread across N warm instances gets up to N× the limit — acceptable
 * for abuse-dampening, not for billing-grade quotas. Swap in a shared store
 * (Redis/Upstash) if a hard global cap is ever needed.
 */

type Window = { count: number; start: number };

const windows = new Map<string, Window>();
// Crude unbounded-growth guard: the key space is per-user, so this only trips
// under a key-cardinality attack. Clearing just resets everyone's window.
const MAX_KEYS = 10_000;

export type RateLimitResult = { ok: boolean; retryAfterMs: number };

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  if (windows.size > MAX_KEYS) windows.clear();

  const current = windows.get(key);
  if (!current || now - current.start >= opts.windowMs) {
    windows.set(key, { count: 1, start: now });
    return { ok: true, retryAfterMs: 0 };
  }
  if (current.count >= opts.limit) {
    return { ok: false, retryAfterMs: opts.windowMs - (now - current.start) };
  }
  current.count += 1;
  return { ok: true, retryAfterMs: 0 };
}
