import "server-only";

import { createClient } from "@/lib/supabase/server";

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  position: number;
};

export type ForumAuthor = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
} | null;

export type TopicListItem = {
  id: string;
  slug: string;
  title: string;
  reply_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  last_activity_at: string;
  created_at: string;
  category: { slug: string; name: string } | null;
  author: ForumAuthor;
};

export type TopicDetail = TopicListItem & {
  body: string;
  author_id: string | null;
  category_id: string | null;
};

export type PostItem = {
  id: string;
  body: string;
  created_at: string;
  author_id: string | null;
  author: ForumAuthor;
};

export type ReportItem = {
  id: string;
  target_type: "topic" | "post";
  target_id: string;
  reason: string | null;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  reporter: ForumAuthor;
};

const TOPIC_LIST_SELECT =
  "id, slug, title, reply_count, is_pinned, is_locked, last_activity_at, created_at, category:categories ( slug, name ), author:profiles ( username, display_name, avatar_url )";

const TOPIC_DETAIL_SELECT = `${TOPIC_LIST_SELECT}, body, author_id, category_id`;

const POST_SELECT =
  "id, body, created_at, author_id, author:profiles ( username, display_name, avatar_url )";

export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, position")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function listTopics(opts?: {
  categorySlug?: string;
  limit?: number;
}): Promise<TopicListItem[]> {
  const supabase = await createClient();

  let categoryId: string | undefined;
  if (opts?.categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.categorySlug)
      .maybeSingle();
    if (!cat) return [];
    categoryId = (cat as { id: string }).id;
  }

  let query = supabase.from("topics").select(TOPIC_LIST_SELECT);
  if (categoryId) query = query.eq("category_id", categoryId);
  query = query
    .order("is_pinned", { ascending: false })
    .order("last_activity_at", { ascending: false });
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TopicListItem[];
}

export async function getTopicBySlug(slug: string): Promise<TopicDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .select(TOPIC_DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as TopicDetail) ?? null;
}

/** The forum topic backing a project/tool discussion, if one has been started. */
export async function getItemTopic(
  itemType: "project" | "tool",
  itemId: string,
): Promise<{ id: string; slug: string; is_locked: boolean } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("topics")
    .select("id, slug, is_locked")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle<{ id: string; slug: string; is_locked: boolean }>();
  return data ?? null;
}

export async function listPosts(topicId: string): Promise<PostItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("topic_id", topicId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PostItem[];
}

/** Open moderation reports (admin-only; RLS enforces). */
export async function listOpenReports(): Promise<ReportItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, target_type, target_id, reason, status, created_at, reporter:profiles!reports_reporter_id_fkey ( username, display_name, avatar_url )",
    )
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ReportItem[];
}
