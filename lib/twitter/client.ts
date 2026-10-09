import "server-only";

import { TwitterApi } from "twitter-api-v2";

const HANDLE = "devsassembleAI";

function creds() {
  const appKey = process.env.X_API_KEY;
  const appSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;
  if (!appKey || !appSecret || !accessToken || !accessSecret) return null;
  return { appKey, appSecret, accessToken, accessSecret };
}

export function twitterConfigured(): boolean {
  return creds() !== null;
}

export type PostResult =
  | { ok: true; id: string; url: string; dev?: boolean }
  | { ok: false; error: string };

/** Post a tweet as @devsassembleAI. Dev-safe: logs instead of posting with no creds. */
export async function postTweet(text: string): Promise<PostResult> {
  const c = creds();
  if (!c) {
    console.log(`[twitter:dev] would post: ${text}`);
    return { ok: true, id: `dev-${text.length}`, url: "", dev: true };
  }
  try {
    const client = new TwitterApi(c);
    const { data } = await client.v2.tweet(text);
    return {
      ok: true,
      id: data.id,
      url: `https://x.com/${HANDLE}/status/${data.id}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}

/** Confirm the credentials authenticate (read-only check; never posts). */
export async function verifyTwitter(): Promise<
  { ok: true; username: string } | { ok: false; error: string }
> {
  const c = creds();
  if (!c) return { ok: false, error: "X credentials not set." };
  try {
    const client = new TwitterApi(c);
    const me = await client.v2.me();
    return { ok: true, username: me.data.username };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}
