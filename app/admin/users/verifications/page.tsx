import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getStudentVerifications } from "@/lib/data/admin/student-verifications";
import { StudentVerificationsShell } from "@/features/admin/users/components/StudentVerificationsShell";
import type { StudentVerificationStatus } from "@/lib/types/admin-student-verifications";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
};

export default async function StudentVerificationsPage({
  searchParams,
}: PageProps) {
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
  const status = params.status as StudentVerificationStatus | undefined;
  const page = Number(params.page ?? 1);
  const limit = 25;

  // 4. Fetch data
  const result = await getStudentVerifications(
    { status: status ?? "pending" },
    page,
    limit,
  );

  // 5. Render
  return (
    <StudentVerificationsShell
      verifications={result.items}
      totalCount={result.totalCount}
      currentStatus={status}
      currentPage={page}
    />
  );
}

export const metadata = {
  title: "Student ID Verifications — Verch Admin",
};
