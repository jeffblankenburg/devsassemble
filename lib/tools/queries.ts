import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ToolCategory } from "@/lib/tools/categories";

export type ToolSubmitter = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
} | null;

type ToolBase = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  category: ToolCategory;
  submitted_by: string | null;
  created_at: string;
  submitter: ToolSubmitter;
};

export type ToolItem = ToolBase & {
  reactions: Record<string, number>;
  reactionCount: number;
  myReactions: string[];
};

const TOOL_SELECT =
  "id, name, url, description, category, submitted_by, created_at, submitter:profiles!tools_submitted_by_fkey ( username, display_name, avatar_url )";

export async function listTools(opts?: {
  sort?: "new" | "top";
  category?: ToolCategory;
}): Promise<ToolItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase.from("tools").select(TOOL_SELECT);
  if (opts?.category) query = query.eq("category", opts.category);
  query = query.order("created_at", { ascending: false }).limit(100);

  const { data, error } = await query;
  if (error) throw error;

  const tools = (data ?? []) as unknown as ToolBase[];
  const ids = tools.map((t) => t.id);
  if (ids.length === 0) return [];

  const { data: reactionRows, error: rErr } = await supabase
    .from("tool_reactions")
    .select("tool_id, emoji, user_id")
    .in("tool_id", ids);
  if (rErr) throw rErr;

  const agg = new Map<
    string,
    { counts: Record<string, number>; mine: string[] }
  >();
  for (const id of ids) agg.set(id, { counts: {}, mine: [] });
  for (const row of (reactionRows ?? []) as {
    tool_id: string;
    emoji: string;
    user_id: string;
  }[]) {
    const entry = agg.get(row.tool_id);
    if (!entry) continue;
    entry.counts[row.emoji] = (entry.counts[row.emoji] ?? 0) + 1;
    if (user && row.user_id === user.id) entry.mine.push(row.emoji);
  }

  const result: ToolItem[] = tools.map((t) => {
    const entry = agg.get(t.id)!;
    const reactionCount = Object.values(entry.counts).reduce((a, b) => a + b, 0);
    return {
      ...t,
      reactions: entry.counts,
      reactionCount,
      myReactions: entry.mine,
    };
  });

  if (opts?.sort === "top") {
    result.sort(
      (a, b) =>
        b.reactionCount - a.reactionCount ||
        (a.created_at < b.created_at ? 1 : -1),
    );
  }
  return result;
}
