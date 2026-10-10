"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin, requireUser } from "@/lib/auth/dal";
import { PUBLIC_SITE_URL } from "@/lib/email/config";
import { topicSchema, replySchema, reportSchema } from "@/lib/validation/forum";
import { slugify } from "@/lib/forum/slug";
import { commitForumImages } from "@/lib/forum/images";
import {
  notifyForumReply,
  notifyNewReport,
  notifyReportResolved,
} from "@/lib/email/send";

/** Plain-text, single-line preview of a markdown body for email. */
function excerpt(body: string, max = 180): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export type ForumFormState = { error?: string; ok?: boolean };

/** Create a topic, generating a unique permanent slug (retry on collision). */
export async function createTopic(
  _prev: ForumFormState,
  formData: FormData,
): Promise<ForumFormState> {
  const user = await requireUser();

  const parsed = topicSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    category_id: formData.get("category_id"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await createClient();
  const base = slugify(parsed.data.title);

  let createdSlug: string | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
    const { data, error } = await supabase
      .from("topics")
      .insert({
        slug,
        title: parsed.data.title,
        body: parsed.data.body,
        category_id: parsed.data.category_id,
        author_id: user.id,
      })
      .select("slug")
      .single();

    if (!error) {
      createdSlug = (data as { slug: string }).slug;
      break;
    }
    if (error.code !== "23505") return { error: error.message };
  }

  if (!createdSlug) {
    return { error: "Could not generate a unique URL. Please try again." };
  }

  await commitForumImages(supabase, parsed.data.body);

  revalidatePath("/discussions");
  redirect(`/discussions/${createdSlug}`);
}

/** Post a reply to a topic (blocked if the topic is locked). */
export async function createReply(
  _prev: ForumFormState,
  formData: FormData,
): Promise<ForumFormState> {
  const user = await requireUser();

  const topicId = String(formData.get("topic_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!topicId) return { error: "Missing topic." };

  const parsed = replySchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Write a reply." };
  }

  const supabase = await createClient();

  const { data: topic } = await supabase
    .from("topics")
    .select("is_locked, author_id, title, slug")
    .eq("id", topicId)
    .maybeSingle<{
      is_locked: boolean;
      author_id: string | null;
      title: string;
      slug: string;
    }>();
  if (topic?.is_locked) {
    return { error: "This topic is locked." };
  }

  const { error } = await supabase
    .from("posts")
    .insert({ topic_id: topicId, body: parsed.data.body, author_id: user.id });
  if (error) return { error: error.message };

  await commitForumImages(supabase, parsed.data.body);

  // Notify the topic author (not the replier themselves).
  if (topic && topic.author_id && topic.author_id !== user.id) {
    const replierName = user.displayName ?? user.username ?? "Someone";
    const body = parsed.data.body;
    after(() =>
      notifyForumReply({
        topicAuthorId: topic.author_id!,
        topicTitle: topic.title,
        slug: topic.slug,
        replierName,
        excerpt: excerpt(body),
      }),
    );
  }

  if (slug) revalidatePath(`/discussions/${slug}`);
  return { ok: true };
}

type ItemTopic = { id: string; slug: string; is_locked: boolean };

/**
 * The forum topic backing a project/tool discussion, created lazily on the
 * first reply. Uses the secret-key client so the topic is system-owned
 * (author_id null) — no single user owns or can delete the shared thread. The
 * (item_type, item_id) unique index resolves the create race.
 */
async function ensureItemTopic(
  admin: SupabaseClient,
  itemType: "project" | "tool",
  itemId: string,
  title: string,
): Promise<ItemTopic> {
  const existing = await admin
    .from("topics")
    .select("id, slug, is_locked")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle<ItemTopic>();
  if (existing.data) return existing.data;

  const base = slugify(title) || itemType;
  const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
  const path = itemType === "project" ? "/projects" : "/tools";
  const { data, error } = await admin
    .from("topics")
    .insert({
      slug,
      title: title.slice(0, 140),
      body: `Discussion for the ${itemType} [${title}](${PUBLIC_SITE_URL}${path}/${itemId}).`,
      item_type: itemType,
      item_id: itemId,
      author_id: null,
      category_id: null,
    })
    .select("id, slug, is_locked")
    .single<ItemTopic>();
  if (!error && data) return data;

  // Lost the create race — the other writer's topic now exists.
  const again = await admin
    .from("topics")
    .select("id, slug, is_locked")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle<ItemTopic>();
  if (again.data) return again.data;
  throw new Error(error?.message ?? "Could not start the discussion.");
}

/** Post a reply to a project/tool discussion, starting the thread if needed. */
export async function createItemReply(
  _prev: ForumFormState,
  formData: FormData,
): Promise<ForumFormState> {
  const user = await requireUser();

  const itemType = String(formData.get("item_type") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const itemTitle = String(formData.get("item_title") ?? "").trim();
  const itemPath = String(formData.get("item_path") ?? "");
  if (itemType !== "project" && itemType !== "tool") {
    return { error: "Unknown item." };
  }
  if (!itemId) return { error: "Missing item." };

  const parsed = replySchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Write a reply." };
  }

  const admin = createAdminClient();
  const topic = await ensureItemTopic(
    admin,
    itemType,
    itemId,
    itemTitle || itemType,
  );
  if (topic.is_locked) return { error: "This discussion is locked." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .insert({ topic_id: topic.id, body: parsed.data.body, author_id: user.id });
  if (error) return { error: error.message };

  await commitForumImages(supabase, parsed.data.body);

  if (itemPath.startsWith("/")) revalidatePath(itemPath);
  return { ok: true };
}

/** Delete a topic. RLS restricts to the author or an admin. */
export async function deleteTopic(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/discussions");
  redirect("/discussions");
}

/** Delete a reply. RLS restricts to the author or an admin. */
export async function deletePost(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;

  if (slug) revalidatePath(`/discussions/${slug}`);
}

/** Lock/unlock a topic (admin/moderator only). */
export async function setTopicLock(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const locked = formData.get("locked") === "true";
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("topics")
    .update({ is_locked: locked })
    .eq("id", id);
  if (error) throw error;

  if (slug) revalidatePath(`/discussions/${slug}`);
}

/** Pin/unpin a topic (admin/moderator only). */
export async function setTopicPin(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const pinned = formData.get("pinned") === "true";
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("topics")
    .update({ is_pinned: pinned })
    .eq("id", id);
  if (error) throw error;

  if (slug) revalidatePath(`/discussions/${slug}`);
}

/** File a moderation report against a topic or post. */
export async function reportContent(
  _prev: ForumFormState,
  formData: FormData,
): Promise<ForumFormState> {
  const user = await requireUser();

  const parsed = reportSchema.safeParse({
    target_type: formData.get("target_type"),
    target_id: formData.get("target_id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "Could not file that report." };

  const supabase = await createClient();
  const reason =
    parsed.data.reason && parsed.data.reason !== "" ? parsed.data.reason : null;
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: parsed.data.target_type,
    target_id: parsed.data.target_id,
    reason,
  });
  if (error) return { error: error.message };

  after(() =>
    notifyNewReport({
      targetType: parsed.data.target_type,
      reason: reason ?? "",
    }),
  );

  return { ok: true };
}

/** Resolve or dismiss a report (admin/moderator only). */
export async function resolveReport(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "dismissed" ? "dismissed" : "resolved";
  if (!id) return;

  const supabase = await createClient();

  // Capture the reporter before updating so we can close the loop by email.
  const { data: report } = await supabase
    .from("reports")
    .select("reporter_id, target_type")
    .eq("id", id)
    .maybeSingle<{ reporter_id: string | null; target_type: string }>();

  const { error } = await supabase
    .from("reports")
    .update({
      status,
      resolved_by: admin.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;

  if (report?.reporter_id) {
    const reporterId = report.reporter_id;
    const contextLabel = `a ${report.target_type}`;
    after(() =>
      notifyReportResolved({ reporterId, status, contextLabel }),
    );
  }

  revalidatePath("/admin/reports");
}
