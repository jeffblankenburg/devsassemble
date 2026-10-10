import { planDay } from "@/lib/tweets/planner";

/**
 * Daily autopilot planner: builds the day's ~10-tweet batch (deduped community +
 * news material → distinct enthusiastic tweets → pre-assigned 8am–10pm ET
 * slots). In supervised mode they await admin approval; in auto mode they're
 * scheduled directly. Never posts — the tweet-publish cron does.
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

  const result = await planDay();
  if (!result.ok) {
    // Benign skips (paused / already planned) shouldn't alarm the cron monitor.
    const status = result.skipped ? 200 : 500;
    return Response.json({ ok: false, reason: result.error }, { status });
  }
  return Response.json({
    ok: true,
    planned: result.planned,
    mode: result.mode,
    batchDate: result.batchDate,
  });
}
