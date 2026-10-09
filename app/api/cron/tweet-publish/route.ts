import { createAdminClient } from "@/lib/supabase/admin";
import { publishTweet } from "@/lib/tweets/publish";

/**
 * Publishes scheduled tweets whose time has arrived — cross-posts to X +
 * Bluesky and flips them to `posted`. A tweet where BOTH platforms fail stays
 * `scheduled` and is retried on the next run (transient failures recover).
 *
 * Guarded by CRON_SECRET (Vercel sends it as a bearer token).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const { data: due, error } = await admin
    .from("tweets")
    .select("id, body, source_url")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(50);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let published = 0;
  for (const t of (due ?? []) as {
    id: string;
    body: string;
    source_url: string | null;
  }[]) {
    const result = await publishTweet(admin, {
      id: t.id,
      body: t.body,
      sourceUrl: t.source_url,
    });
    if (result.ok) published += 1;
    else console.error(`[tweet-publish] ${t.id} failed:`, result.error);
  }

  return Response.json({ published, due: due?.length ?? 0 });
}
