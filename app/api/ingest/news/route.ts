import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ingest endpoint for IFTTT (or any webhook) to push news items the tweet
 * drafter will consider. Guarded by a token in the query string
 * (?token=<NEWS_INGEST_SECRET>) since IFTTT's free tier can't set headers.
 *
 * Body (JSON): { source?, title, url }. Dedups on url; prunes items > 14 days.
 */
export async function POST(request: Request) {
  const secret = process.env.NEWS_INGEST_SECRET;
  const { searchParams } = new URL(request.url);
  if (!secret || searchParams.get("token") !== secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { source?: unknown; title?: unknown; url?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json body" }, { status: 400 });
  }

  const source = String(body.source ?? "IFTTT").trim().slice(0, 80);
  const title = String(body.title ?? "").trim().slice(0, 300);
  const url = String(body.url ?? "").trim();
  if (!title || !/^https?:\/\//i.test(url)) {
    return Response.json(
      { error: "title and an http(s) url are required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  // Keep the table small.
  await admin
    .from("news_ingest")
    .delete()
    .lt(
      "created_at",
      new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    );

  const { error } = await admin
    .from("news_ingest")
    .upsert({ source, title, url }, { onConflict: "url", ignoreDuplicates: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
