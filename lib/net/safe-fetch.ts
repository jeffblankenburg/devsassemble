import "server-only";

import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

/**
 * Hardened fetch for ATTACKER-SUPPLIED URLs (link-preview unfurling).
 *
 * The link-preview pipeline fetches whatever URL a member pastes into a post.
 * A naive fetch of that URL is a textbook SSRF vector: the URL could point at
 * `http://169.254.169.254/` (cloud metadata), `http://localhost:…` (internal
 * admin panels), or a private RFC-1918 host, and a redirect can bounce an
 * innocent-looking public URL onto any of those. This module is the single
 * choke point every outbound unfurl request MUST go through.
 *
 * Defenses, in order:
 *   1. Scheme allowlist — http/https only (no file:, gopher:, data:, …).
 *   2. Port allowlist — default or explicit 80/443 only.
 *   3. DNS validation — resolve the host and reject if ANY returned address is
 *      private/reserved/loopback/link-local. Rejecting on *any* bad address
 *      (not just the one we'd connect to) defeats the "resolve to one public
 *      and one private A record" trick.
 *   4. Per-hop revalidation — redirects are followed manually; every Location
 *      is re-parsed and re-validated through steps 1–3 before we follow it.
 *   5. Resource caps — short timeout, hard byte ceiling (streamed, so an
 *      attacker can't exhaust memory), and a content-type allowlist.
 *
 * Residual risk: between our dns.lookup() check and fetch()'s own internal
 * resolution there is a small DNS-rebinding window (the record could flip to a
 * private IP in that gap). We shrink it with a short timeout; fully closing it
 * needs IP pinning via a custom undici connector, which we deliberately skip to
 * avoid pinning a second copy of undici against Node's bundled one. Document
 * this if the threat model ever tightens.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_PORTS = new Set(["", "80", "443"]);
const MAX_REDIRECTS = 4;
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB — ample for an HTML <head>.

// A plausible desktop browser UA. Some sites gate OG tags behind a real-looking
// agent; a bare fetch UA often gets a bot wall with no metadata.
const USER_AGENT =
  "Mozilla/5.0 (compatible; DevsAssembleBot/1.0; +https://devsassemble.ai/about)";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

/** IPv4 dotted-quad → unsigned 32-bit int, or null if malformed. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
}

/** CIDR blocks that must never be reachable, as [network, prefix] on ints. */
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (incl. 169.254.169.254 cloud metadata)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay anycast
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved (incl. 255.255.255.255 broadcast)
];

function isBlockedV4(ip: string): boolean {
  const addr = ipv4ToInt(ip);
  if (addr === null) return true; // unparseable → treat as unsafe
  for (const [net, prefix] of BLOCKED_V4) {
    const base = ipv4ToInt(net);
    if (base === null) continue;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    if ((addr & mask) === (base & mask)) return true;
  }
  return false;
}

function isBlockedV6(raw: string): boolean {
  const ip = raw.toLowerCase().split("%")[0]; // strip any zone id
  if (ip === "::1" || ip === "::") return true; // loopback / unspecified
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible — judge the embedded v4.
  const mapped = ip.match(/::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isBlockedV4(mapped[1]);
  if (ip.startsWith("fe80") || ip.startsWith("fe9") || ip.startsWith("fea") || ip.startsWith("feb"))
    return true; // link-local fe80::/10
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // ULA fc00::/7
  if (ip.startsWith("ff")) return true; // multicast ff00::/8
  if (ip.startsWith("2001:db8")) return true; // documentation
  if (ip.startsWith("64:ff9b")) return true; // NAT64 well-known prefix
  return false;
}

/** True when an already-resolved literal IP is in a forbidden range. */
export function isBlockedIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isBlockedV4(ip);
  if (family === 6) return isBlockedV6(ip);
  return true; // not a valid IP literal → unsafe
}

/**
 * Validate a single URL's scheme, port, and host. Resolves the hostname and
 * throws UnsafeUrlError if the scheme/port is disallowed or any resolved
 * address falls in a blocked range.
 */
async function assertSafeUrl(url: URL): Promise<void> {
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new UnsafeUrlError(`Disallowed scheme: ${url.protocol}`);
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new UnsafeUrlError(`Disallowed port: ${url.port}`);
  }

  const host = url.hostname.replace(/^\[|\]$/g, ""); // unwrap [::1] form

  // A literal IP in the URL skips DNS — validate it directly.
  if (isIP(host)) {
    if (isBlockedIp(host)) {
      throw new UnsafeUrlError(`Blocked IP address: ${host}`);
    }
    return;
  }

  // Reject hostnames that can't be public before paying for a DNS lookup.
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local")) {
    throw new UnsafeUrlError(`Blocked hostname: ${host}`);
  }

  let records: Array<{ address: string }>;
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError(`Could not resolve host: ${host}`);
  }
  if (records.length === 0) {
    throw new UnsafeUrlError(`Host did not resolve: ${host}`);
  }
  // Reject if ANY resolved address is unsafe (defeats mixed public/private DNS).
  for (const { address } of records) {
    if (isBlockedIp(address)) {
      throw new UnsafeUrlError(`Host resolves to a blocked address: ${host}`);
    }
  }
}

export type SafeFetchResult = {
  finalUrl: string;
  status: number;
  contentType: string;
  /** The response body, truncated at maxBytes. */
  body: Uint8Array;
};

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  /** Allowed content-type prefixes, e.g. ["text/html"] or ["image/"]. */
  acceptTypes?: string[];
};

/** Read a response body into memory, aborting if it exceeds maxBytes. */
async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.length;
        if (total > maxBytes) {
          await reader.cancel();
          throw new UnsafeUrlError(`Response exceeded ${maxBytes} bytes`);
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

/**
 * Fetch an attacker-supplied URL with full SSRF protection. Follows redirects
 * manually, revalidating every hop. Throws UnsafeUrlError when a URL (or any
 * hop) is disallowed, times out, or exceeds the size/content-type limits.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("Malformed URL");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertSafeUrl(current);

    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,image/*;q=0.9,*/*;q=0.8",
      },
    });

    if (REDIRECT_CODES.has(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new UnsafeUrlError("Redirect with no Location header");
      }
      // Drain the redirect body so the connection can be reused/closed.
      await response.body?.cancel();
      let next: URL;
      try {
        next = new URL(location, current); // resolve relative redirects
      } catch {
        throw new UnsafeUrlError("Malformed redirect target");
      }
      current = next;
      continue;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (options.acceptTypes && options.acceptTypes.length > 0) {
      const base = contentType.split(";")[0].trim().toLowerCase();
      const ok = options.acceptTypes.some((prefix) => base.startsWith(prefix));
      if (!ok) {
        await response.body?.cancel();
        throw new UnsafeUrlError(`Unexpected content-type: ${base || "(none)"}`);
      }
    }

    const body = await readCapped(response, maxBytes);
    return {
      finalUrl: current.toString(),
      status: response.status,
      contentType,
      body,
    };
  }

  throw new UnsafeUrlError(`Too many redirects (> ${MAX_REDIRECTS})`);
}
