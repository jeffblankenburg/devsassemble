import { getSessionUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Live slug availability check for the event form. Admin-only (so the query,
 * under RLS, can see draft events too). Returns { available: boolean | null }.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "moderator")) {
    return Response.json({ available: null, error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") ?? "").trim().toLowerCase();
  const exclude = searchParams.get("exclude");
  if (!slug) return Response.json({ available: null });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    return Response.json({ available: null, error: error.message }, { status: 500 });
  }

  // Available if nothing matches, or the only match is the event being edited.
  const available = !data || (exclude != null && data.id === exclude);
  return Response.json({ available, slug });
}
