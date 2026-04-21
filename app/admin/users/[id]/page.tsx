import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getCachedAdminUserDetail } from "@/lib/data/admin/users";
import { AdminUserDetail } from "@/features/admin/users/components/AdminUserDetail";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function UserDetailPage({ params }: PageProps) {
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

  // 3. Parse params
  const { id } = await params;

  // 4. Fetch data
  const userDetail = await getCachedAdminUserDetail(id);

  if (!userDetail) {
    notFound();
  }

  // 5. Render
  return <AdminUserDetail user={userDetail} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const userDetail = await getCachedAdminUserDetail(id);

  return {
    title: userDetail
      ? `${userDetail.fullName} — Verch Admin`
      : "User Not Found — Verch Admin",
  };
}
