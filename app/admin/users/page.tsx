import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCachedAdminUsers } from "@/lib/data/admin/users";
import { getPendingVerificationCount } from "@/lib/data/admin/student-verifications";
import { AdminUsersShell } from "@/features/admin/users/components/AdminUsersShell";
import type { UserRole } from "@/lib/types/admin-users";

type PageProps = {
  searchParams: Promise<{
    search?: string;
    role?: string;
    page?: string;
  }>;
};

export default async function UsersPage({ searchParams }: PageProps) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 2. Role gate — platform admin only
  const { data: userRecord } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userRecord?.role !== "admin") {
    redirect("/login");
  }

  // 3. Parse filters from searchParams
  const params = await searchParams;
  const search = params.search;
  const role = params.role as UserRole | "all" | undefined;
  const page = Number(params.page ?? 1);

  // 4. Fetch data
  const result = await getCachedAdminUsers({
    search,
    role: role ?? "all",
    page,
    pageSize: 20,
  });

  // 5. Fetch pending verification count
  const pendingVerificationCount = await getPendingVerificationCount();

  // 6. Render
  return (
    <AdminUsersShell
      users={result.users}
      totalCount={result.totalCount}
      currentRole={role}
      currentSearch={search}
      currentPage={result.page}
      totalPages={result.totalPages}
      pendingVerificationCount={pendingVerificationCount}
    />
  );
}

export const metadata = {
  title: "Users — Verch Admin",
};
