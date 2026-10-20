import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/dal";

/**
 * Outbound click tracker for link-preview cards. Looks up the vetted URL by
 * link_previews id, records the click (link + source discussion + signed-in
 * user, via after() so the redirect isn't delayed), then 302s to the target.
 *
 * NOT an open redirect: we only ever redirect to a URL already stored in
 * link_previews (fetched through the SSRF-safe pipeline), and re-check the
 * scheme is http(s) before sending the Location. An unknown/malformed id just
 * bounces home.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const home = new URL("/", request.url);
  if (!UUID.test(id)) return Response.redirect(home, 302);

  const admin = createAdminClient();
  const { data } = await admin
    .from("link_previews")
    .select("url")
    .eq("id", id)
    .maybeSingle<{ url: string }>();

  const url = data?.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    return Response.redirect(home, 302);
  }

  const from = new URL(request.url).searchParams.get("from");
  const topicId = from && UUID.test(from) ? from : null;
  const user = await getSessionUser();
  const userId = user?.id ?? null;

  after(async () => {
    await admin.from("link_clicks").insert({
      link_preview_id: id,
      topic_id: topicId,
      user_id: userId,
    });
  });

  return Response.redirect(url, 302);
}
