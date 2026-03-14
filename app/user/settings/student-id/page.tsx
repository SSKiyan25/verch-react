import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCachedStudentInfo } from "@/lib/data/user-customer";
import { StudentIdPage } from "@/features/user/settings/components/student-id/StudentIdPageClient";

export default async function StudentIdSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const studentInfo = await getCachedStudentInfo(user.id);
  // console.log("[StudentIdSettingsPage] Fetched studentInfo:", studentInfo);
  return <StudentIdPage studentInfo={studentInfo} userId={user.id} />;
}
