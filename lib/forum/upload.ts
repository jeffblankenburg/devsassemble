"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import {
  FORUM_IMAGE_BUCKET,
  FORUM_IMAGE_MAX_BYTES,
  FORUM_IMAGE_TYPES,
  forumImageExt,
} from "@/lib/forum/image-constants";

export type ForumUploadResult = { url?: string; error?: string };

/**
 * Upload an image for inline use in a discussion. Called imperatively from the
 * composer (before the post is submitted), so the returned URL can be dropped
 * into the markdown body. The upload is recorded in forum_uploads as
 * uncommitted; createTopic/createReply commit it, and the daily sweep reclaims
 * it if the post is never submitted.
 */
export async function uploadForumImage(
  formData: FormData,
): Promise<ForumUploadResult> {
  const user = await requireUser();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (!FORUM_IMAGE_TYPES.includes(file.type as (typeof FORUM_IMAGE_TYPES)[number])) {
    return { error: "Images must be JPG, PNG, WebP, or GIF." };
  }
  if (file.size > FORUM_IMAGE_MAX_BYTES) {
    return { error: "Please keep images under 4 MB." };
  }
  const ext = forumImageExt(file.type);
  if (!ext) return { error: "That image type isn't supported." };

  const bytes = Buffer.from(await file.arrayBuffer());
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${user.id}/${Date.now()}-${rand}.${ext}`;

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(FORUM_IMAGE_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) return { error: uploadError.message };

  const url = supabase.storage.from(FORUM_IMAGE_BUCKET).getPublicUrl(path).data
    .publicUrl;

  const { error: ledgerError } = await supabase
    .from("forum_uploads")
    .insert({ path, url, author_id: user.id });
  if (ledgerError) {
    // Don't leave a storage object with no ledger row — it could never be swept.
    await supabase.storage.from(FORUM_IMAGE_BUCKET).remove([path]);
    return { error: ledgerError.message };
  }

  return { url };
}
