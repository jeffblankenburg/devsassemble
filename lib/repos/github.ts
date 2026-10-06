import "server-only";

/** Extract owner/name from a GitHub URL (or owner/name shorthand). */
export function parseGithubUrl(
  url: string,
): { owner: string; name: string } | null {
  const m = url.trim().match(/github\.com[/:]([^/\s]+)\/([^/\s#?]+)/i);
  if (!m) return null;
  return { owner: m[1], name: m[2].replace(/\.git$/i, "") };
}

export type RepoMeta = {
  description: string | null;
  homepage_url: string | null;
  stars: number | null;
  language: string | null;
  owner_avatar_url: string | null;
};

/** Fetch public repo metadata from the GitHub API. Returns null on any failure
 * (rate limit, private, not found) so submission still works with the URL. */
export async function fetchRepoMeta(
  owner: string,
  name: string,
): Promise<RepoMeta | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "DevsAssemble",
    };
    if (process.env.GITHUB_API_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_API_TOKEN}`;
    }
    const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      headers,
    });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      description?: string | null;
      homepage?: string | null;
      stargazers_count?: number;
      language?: string | null;
      owner?: { avatar_url?: string | null };
    };
    return {
      description: d.description ?? null,
      homepage_url: d.homepage || null,
      stars: typeof d.stargazers_count === "number" ? d.stargazers_count : null,
      language: d.language ?? null,
      owner_avatar_url: d.owner?.avatar_url ?? null,
    };
  } catch {
    return null;
  }
}
