import "server-only";

import { createClient } from "@/lib/supabase/server";

export type RepoKind = "build" | "recommendation";

export type RepoSubmitter = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
} | null;

type RepoBase = {
  id: string;
  owner: string;
  name: string;
  github_url: string;
  description: string | null;
  homepage_url: string | null;
  stars: number | null;
  language: string | null;
  owner_avatar_url: string | null;
  kind: RepoKind;
  note: string | null;
  submitted_by: string | null;
  created_at: string;
  submitter: RepoSubmitter;
};

export type RepoItem = RepoBase & {
  reactions: Record<string, number>;
  reactionCount: number;
  myReactions: string[];
};

const REPO_SELECT =
  "id, owner, name, github_url, description, homepage_url, stars, language, owner_avatar_url, kind, note, submitted_by, created_at, submitter:profiles!repos_submitted_by_fkey ( username, display_name, avatar_url )";

export async function listRepos(opts?: {
  sort?: "new" | "top";
  kind?: RepoKind;
}): Promise<RepoItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase.from("repos").select(REPO_SELECT);
  if (opts?.kind) query = query.eq("kind", opts.kind);
  query = query.order("created_at", { ascending: false }).limit(100);

  const { data, error } = await query;
  if (error) throw error;

  const repos = (data ?? []) as unknown as RepoBase[];
  const ids = repos.map((r) => r.id);
  if (ids.length === 0) return [];

  const { data: reactionRows, error: rErr } = await supabase
    .from("repo_reactions")
    .select("repo_id, emoji, user_id")
    .in("repo_id", ids);
  if (rErr) throw rErr;

  const agg = new Map<string, { counts: Record<string, number>; mine: string[] }>();
  for (const id of ids) agg.set(id, { counts: {}, mine: [] });
  for (const row of (reactionRows ?? []) as {
    repo_id: string;
    emoji: string;
    user_id: string;
  }[]) {
    const entry = agg.get(row.repo_id);
    if (!entry) continue;
    entry.counts[row.emoji] = (entry.counts[row.emoji] ?? 0) + 1;
    if (user && row.user_id === user.id) entry.mine.push(row.emoji);
  }

  const result: RepoItem[] = repos.map((r) => {
    const entry = agg.get(r.id)!;
    const reactionCount = Object.values(entry.counts).reduce((a, b) => a + b, 0);
    return { ...r, reactions: entry.counts, reactionCount, myReactions: entry.mine };
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

export type RecentRepo = {
  id: string;
  owner: string;
  name: string;
  kind: RepoKind;
  created_at: string;
};

/** Newest repos, for the home activity feed. Public read. */
export async function listRecentRepos(limit = 4): Promise<RecentRepo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("repos")
    .select("id, owner, name, kind, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as RecentRepo[];
}
