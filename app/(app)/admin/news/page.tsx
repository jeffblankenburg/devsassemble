import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewsFeed, type NewsItemRow } from "@/components/admin/news-feed";

export const metadata: Metadata = { title: "Captured news" };

export default async function AdminNewsPage() {
  await requireAdmin();

  const admin = createAdminClient();
  const { data } = await admin
    .from("news_ingest")
    .select("id, source, title, url, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const items = (data ?? []) as NewsItemRow[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
        Captured news
      </h1>
      <p className="mt-2 text-brand-ink/70">
        Items pushed in from Reddit (via IFTTT) and other sources — the raw feed,
        newest first.
      </p>

      <NewsFeed items={items} />
    </main>
  );
}
