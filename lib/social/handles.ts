import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SocialHandle = {
  id: string;
  name: string;
  aliases: string[];
  x_handle: string | null;
  bluesky_handle: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
};

/** A verified handle actually present in a tweet body (stored on the row). */
export type TweetMention = {
  name: string;
  x_handle: string;
  bluesky_handle: string | null;
};

/** Verified, taggable handles — the only ones generation may put in a post. */
export async function getVerifiedHandles(
  db: SupabaseClient,
): Promise<SocialHandle[]> {
  const { data } = await db
    .from("social_handles")
    .select("*")
    .eq("verified", true)
    .not("x_handle", "is", null)
    .order("name");
  return (data ?? []) as SocialHandle[];
}

/** Format the verified registry for the drafting prompt, or null if empty. */
export function registryToPromptText(handles: SocialHandle[]): string | null {
  const usable = handles.filter((h) => h.x_handle);
  if (usable.length === 0) return null;
  return usable
    .map((h) => `- ${[h.name, ...(h.aliases ?? [])].join(", ")} → @${h.x_handle}`)
    .join("\n");
}

const HANDLE_RE = /@([A-Za-z0-9_]{1,30})/g;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Keep only @handles that match a VERIFIED registry entry (normalizing their
 * casing); demote every other @handle to plain text so a hallucinated or
 * unverified tag can never go live. Returns the cleaned body and the verified
 * mentions present in it (for the cross-platform swap at post time).
 */
export function reconcileBody(
  body: string,
  verified: SocialHandle[],
): { body: string; mentions: TweetMention[] } {
  const byHandle = new Map<string, SocialHandle>();
  for (const h of verified) {
    if (h.x_handle) byHandle.set(h.x_handle.toLowerCase(), h);
  }
  const mentions: TweetMention[] = [];
  const seen = new Set<string>();
  const cleaned = body.replace(HANDLE_RE, (_match, handle: string) => {
    const hit = byHandle.get(handle.toLowerCase());
    if (!hit || !hit.x_handle) return handle; // strip the @ from unknown handles
    if (!seen.has(hit.id)) {
      seen.add(hit.id);
      mentions.push({
        name: hit.name,
        x_handle: hit.x_handle,
        bluesky_handle: hit.bluesky_handle,
      });
    }
    return `@${hit.x_handle}`; // normalize to the registry's casing
  });
  return { body: cleaned, mentions };
}

/**
 * For Bluesky: swap each mention's X handle for its Bluesky handle so Bluesky's
 * RichText resolves a real mention. Mentions without a Bluesky handle are left
 * as-is (a bare @xhandle just renders as plain text on Bluesky — no mis-tag).
 */
export function applyBlueskyHandles(
  body: string,
  mentions: TweetMention[],
): string {
  let out = body;
  for (const m of mentions) {
    if (!m.bluesky_handle) continue;
    const re = new RegExp(`@${escapeRe(m.x_handle)}\\b`, "g");
    out = out.replace(re, `@${m.bluesky_handle}`);
  }
  return out;
}

/** Record AI-proposed handles as UNVERIFIED candidates for admin review. */
export async function upsertProposals(
  db: SupabaseClient,
  proposals: { name?: string | null; x_handle?: string | null }[],
): Promise<void> {
  const clean = proposals
    .map((p) => ({
      name: (p.name ?? "").trim().slice(0, 80),
      x_handle: (p.x_handle ?? "").trim().replace(/^@/, "").slice(0, 30),
    }))
    .filter((p) => p.name.length > 0);
  if (clean.length === 0) return;
  // New names only — never downgrade an existing (possibly verified) row.
  await db.from("social_handles").upsert(
    clean.map((p) => ({
      name: p.name,
      x_handle: p.x_handle || null,
      verified: false,
    })),
    { onConflict: "name", ignoreDuplicates: true },
  );
}
