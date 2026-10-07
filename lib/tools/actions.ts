"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import { toolSubmitSchema } from "@/lib/validation/tools";
import { isReactionEmoji } from "@/lib/repos/reactions";

export type ToolFormState = { error?: string };

/** Normalize a URL for dedup: lowercase host, drop hash, strip trailing slash. */
function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    let s = u.toString();
    s = s.replace(/\/+$/, "");
    return s;
  } catch {
    return null;
  }
}

export async function submitTool(
  _prev: ToolFormState,
  formData: FormData,
): Promise<ToolFormState> {
  const user = await requireUser();

  const parsed = toolSubmitSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    category: formData.get("category"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const url = normalizeUrl(parsed.data.url);
  if (!url) return { error: "That doesn't look like a valid https URL." };

  const supabase = await createClient();
  const { error } = await supabase.from("tools").insert({
    name: parsed.data.name,
    url,
    category: parsed.data.category,
    description:
      parsed.data.description && parsed.data.description !== ""
        ? parsed.data.description
        : null,
    submitted_by: user.id,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "That tool's already on the shelf." };
    return { error: error.message };
  }

  revalidatePath("/tools");
  redirect("/tools");
}

/** Toggle one emoji reaction for the current user on a tool. */
export async function toggleToolReaction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const toolId = String(formData.get("tool_id") ?? "");
  const emoji = String(formData.get("emoji") ?? "");
  if (!toolId || !isReactionEmoji(emoji)) return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("tool_reactions")
    .select("tool_id")
    .eq("tool_id", toolId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("tool_reactions")
      .delete()
      .eq("tool_id", toolId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);
  } else {
    await supabase
      .from("tool_reactions")
      .insert({ tool_id: toolId, user_id: user.id, emoji });
  }

  revalidatePath("/tools");
}
