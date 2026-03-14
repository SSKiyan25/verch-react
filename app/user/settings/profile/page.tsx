import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCachedUserProfileData } from "@/lib/data/user-customer";
import { ProfileForm } from "@/features/user/settings/components/profile/ProfileForm";

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCachedUserProfileData(user.id);

  return <ProfileForm profile={profile} userId={user.id} />;
}
