import { draftTweets } from "@/lib/tweets/pipeline";
import { notifyTweetDrafts } from "@/lib/email/send";

/**
 * Daily tweet draft cycle: gather community material, ask Claude for options,
 * store a draft row, and email admins that drafts are ready. Never posts —
 * posting is a manual approval in /admin/tweets.
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

  const result = await draftTweets();
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  await notifyTweetDrafts(result.preview);
  return Response.json({ ok: true, id: result.id, options: result.optionCount });
}
