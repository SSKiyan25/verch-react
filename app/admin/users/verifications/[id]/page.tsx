import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getStudentVerificationDetail } from "@/lib/data/admin/student-verifications";
import { getSignedDownloadUrl } from "@/lib/firebase/storage-helpers";
import { StudentVerificationDetail } from "@/features/admin/users/components/StudentVerificationDetail";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudentVerificationDetailPage({
  params,
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

  // 3. Get student info ID from params
  const { id: studentInfoId } = await params;

  // 4. Fetch verification detail
  const verification = await getStudentVerificationDetail(studentInfoId);

  if (!verification) {
    notFound();
  }

  // 5. Generate signed URL for ID photo (if exists)
  // ID photos are in PRIVATE bucket — must use signed URL
  const idPhotoUrl = verification.id_photo_path
    ? await getSignedDownloadUrl(verification.id_photo_path, 60) // 60 minutes expiry
    : null;

  // 6. Render
  return (
    <StudentVerificationDetail
      verification={verification}
      idPhotoUrl={idPhotoUrl}
    />
  );
}

export const metadata = {
  title: "Student Verification Detail — Verch Admin",
};
