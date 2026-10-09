import "server-only";

import { AtpAgent, RichText } from "@atproto/api";

const SERVICE = "https://bsky.social";

function creds() {
  const identifier = process.env.BLUESKY_IDENTIFIER;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!identifier || !password) return null;
  return { identifier, password };
}

export function blueskyConfigured(): boolean {
  return creds() !== null;
}

export type SkeetResult =
  | { ok: true; uri: string; url: string; dev?: boolean }
  | { ok: false; error: string };

/** at://did/app.bsky.feed.post/<rkey> → a bsky.app web URL. */
function webUrl(did: string, uri: string): string {
  const rkey = uri.split("/").pop() ?? "";
  return `https://bsky.app/profile/${did}/post/${rkey}`;
}

/** Post to Bluesky as @devsassemble.ai. Dev-safe: logs instead with no creds. */
export async function postSkeet(text: string): Promise<SkeetResult> {
  const c = creds();
  if (!c) {
    console.log(`[bluesky:dev] would post: ${text}`);
    return { ok: true, uri: "dev", url: "", dev: true };
  }
  try {
    const agent = new AtpAgent({ service: SERVICE });
    await agent.login({ identifier: c.identifier, password: c.password });
    // RichText detects links/mentions/tags so they render as real facets.
    const rt = new RichText({ text });
    await rt.detectFacets(agent);
    const res = await agent.post({
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    });
    const did = agent.session?.did ?? c.identifier;
    return { ok: true, uri: res.uri, url: webUrl(did, res.uri) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}

/** Confirm the app password authenticates (logs in; never posts). */
export async function verifyBluesky(): Promise<
  { ok: true; handle: string } | { ok: false; error: string }
> {
  const c = creds();
  if (!c) return { ok: false, error: "Bluesky credentials not set." };
  try {
    const agent = new AtpAgent({ service: SERVICE });
    const res = await agent.login({ identifier: c.identifier, password: c.password });
    return { ok: true, handle: res.data.handle };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}
