"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import { repoSubmitSchema, repoNoteSchema } from "@/lib/validation/repos";
import { parseGithubUrl, fetchRepoMeta } from "@/lib/repos/github";
import { isReactionEmoji } from "@/lib/repos/reactions";

export type RepoFormState = { error?: string; ok?: boolean };

export async function submitRepo(
  _prev: RepoFormState,
  formData: FormData,
): Promise<RepoFormState> {
  const user = await requireUser();

  const parsed = repoSubmitSchema.safeParse({
    github_url: formData.get("github_url"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const gh = parseGithubUrl(parsed.data.github_url);
  if (!gh) return { error: "That doesn't look like a GitHub repository URL." };

  const meta = await fetchRepoMeta(gh.owner, gh.name);

  const supabase = await createClient();
  const { error } = await supabase.from("repos").insert({
    owner: gh.owner.toLowerCase(),
    name: gh.name.toLowerCase(),
    github_url: `https://github.com/${gh.owner}/${gh.name}`,
    description: meta?.description ?? null,
    homepage_url: meta?.homepage_url ?? null,
    stars: meta?.stars ?? null,
    language: meta?.language ?? null,
    owner_avatar_url: meta?.owner_avatar_url ?? null,
    kind: "build",
    note: parsed.data.note && parsed.data.note !== "" ? parsed.data.note : null,
    submitted_by: user.id,
    last_synced_at: meta ? new Date().toISOString() : null,
  });

  if (error) {
    if (error.code === "23505") return { error: "That repo's already on the board." };
    return { error: error.message };
  }

  revalidatePath("/projects");
  redirect("/projects");
}

/** Update a project's note. RLS restricts the write to the submitter or admin. */
export async function updateRepoNote(
  _prev: RepoFormState,
  formData: FormData,
): Promise<RepoFormState> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing project." };

  const parsed = repoNoteSchema.safeParse({ note: formData.get("note") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the note." };
  }
  const note =
    parsed.data.note && parsed.data.note !== "" ? parsed.data.note : null;

  const supabase = await createClient();
  const { error } = await supabase.from("repos").update({ note }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return { ok: true };
}

/**
 * Re-pull the GitHub-derived fields (description, stars, language, homepage,
 * avatar) for a project. RLS restricts the write to the submitter or admin.
 */
export async function resyncRepo(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: repo } = await supabase
    .from("repos")
    .select("owner, name")
    .eq("id", id)
    .maybeSingle<{ owner: string; name: string }>();
  if (!repo) return;

  const meta = await fetchRepoMeta(repo.owner, repo.name);
  if (!meta) return; // couldn't reach GitHub — leave the existing data untouched

  const { error } = await supabase
    .from("repos")
    .update({
      description: meta.description ?? null,
      homepage_url: meta.homepage_url ?? null,
      stars: meta.stars ?? null,
      language: meta.language ?? null,
      owner_avatar_url: meta.owner_avatar_url ?? null,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

/** Delete a project. RLS restricts the delete to the submitter or admin. */
export async function deleteRepo(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("repos").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/projects");
  redirect("/projects");
}

/** Toggle one emoji reaction for the current user on a repo. */
export async function toggleReaction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const repoId = String(formData.get("repo_id") ?? "");
  const emoji = String(formData.get("emoji") ?? "");
  if (!repoId || !isReactionEmoji(emoji)) return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("repo_reactions")
    .select("repo_id")
    .eq("repo_id", repoId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("repo_reactions")
      .delete()
      .eq("repo_id", repoId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);
  } else {
    await supabase
      .from("repo_reactions")
      .insert({ repo_id: repoId, user_id: user.id, emoji });
  }

  revalidatePath("/projects");
}
