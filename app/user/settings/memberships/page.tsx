import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCachedUserMemberships,
  getCachedStudentInfo,
} from "@/lib/data/user-customer";
import { MembershipList } from "@/features/user/settings/components/memberships/MembershipList";

export default async function MembershipsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [memberships, studentInfo] = await Promise.all([
    getCachedUserMemberships(user.id),
    getCachedStudentInfo(user.id),
  ]);

  const isStudentVerified = studentInfo?.verification_status === "verified";

  return (
    <MembershipList
      memberships={memberships}
      userId={user.id}
      isStudentVerified={isStudentVerified}
    />
  );
}
