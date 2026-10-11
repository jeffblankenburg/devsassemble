"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

function cleanHandle(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim().replace(/^@+/, "").slice(0, 60);
  return s || null;
}

/** Create or update a registry handle. Saving implies review → verified. */
export async function saveHandle(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const x_handle = cleanHandle(formData.get("x_handle"));
  const bluesky_handle = cleanHandle(formData.get("bluesky_handle"));
  const verified = formData.get("verified") !== "false";
  if (!name) return;

  const admin = createAdminClient();
  if (id) {
    await admin
      .from("social_handles")
      .update({ name, x_handle, bluesky_handle, verified })
      .eq("id", id);
  } else {
    await admin
      .from("social_handles")
      .upsert(
        { name, x_handle, bluesky_handle, verified },
        { onConflict: "name" },
      );
  }
  revalidatePath("/admin/handles");
}

/** Remove a handle (also how you reject an AI proposal). */
export async function deleteHandle(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("social_handles").delete().eq("id", id);
  revalidatePath("/admin/handles");
}
