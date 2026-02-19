"use server";

import { createClient } from "@/lib/supabase/server";
import { getCachedUserProfile } from "@/lib/data/user";

export async function getCachedUserOrganization() {
  // 1. Verify Auth on the Server (Secure)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 2. Hit the Cache (Fast & Cheap)
  // This runs on the server, so 'unstable_cache' works perfectly here.
  const userProfile = await getCachedUserProfile(user.id);

  return userProfile?.organization_id || null;
}
