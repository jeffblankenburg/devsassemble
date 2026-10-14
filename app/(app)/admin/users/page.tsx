import type { Metadata } from "next";
import { requireCapability, getSessionUser } from "@/lib/auth/dal";
import { listManagedUsers } from "@/lib/users/queries";
import { UserManager } from "@/components/admin/user-manager";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  await requireCapability("manage_users");
  const [users, me] = await Promise.all([
    listManagedUsers(),
    getSessionUser(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
        Users
      </h1>
      <p className="mt-2 max-w-2xl text-brand-ink/70">
        Assign access. <strong>Admin</strong> is full access; otherwise grant
        just the capabilities a person needs. Only admins can change access, and
        you can&apos;t edit your own.
      </p>

      <UserManager users={users} currentUserId={me?.id ?? ""} />
    </main>
  );
}
