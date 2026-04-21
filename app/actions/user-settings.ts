"use server";

import { createClient } from "@/lib/supabase/server";
import { getCachedUserProfile } from "@/lib/data/user";
import { getCachedOrganization } from "@/lib/data/organization";
import {
  invalidateUserCache,
  invalidateOrganizationCache,
} from "@/lib/data/cache-helpers";

export async function getUserSecurityStatus() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  //   console.log("Authenticated user:", authUser);
  if (!authUser) return null;

  // 1. Fetch User Profile
  const userProfile = await getCachedUserProfile(authUser.id);
  if (!userProfile) return null;

  // 2. Fetch Organization (if user has one)
  let organization = null;
  if (userProfile.organization_id) {
    organization = await getCachedOrganization(userProfile.organization_id);
  }

  // 3. Return Combined Context
  return {
    userId: userProfile.id,
    isOrganizationAdmin: userProfile.role === "organization_admin",
    hasChangedDefaultPassword:
      userProfile.has_changed_default_password ?? false,

    // Org Details (Safe to return null if none exists)
    organizationId: organization?.id || null,
    organizationName: organization?.name || null,
    organizationStatus: organization?.status || null,
  };
}

export async function changeUserPasswordAction(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return { success: false, error: "Unauthorized" };

  const userProfile = await getCachedUserProfile(authUser.id);

  // Security Check: Ensure they are an Admin
  if (
    !userProfile?.organization_id ||
    userProfile.role !== "organization_admin"
  ) {
    return { success: false, error: "Permission denied" };
  }

  // Security Check: Ensure Org is Active (Optional but recommended)
  const org = await getCachedOrganization(userProfile.organization_id);
  if (org?.status === "suspended") {
    return {
      success: false,
      error: "Organization is suspended. Contact support.",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: data.newPassword,
  });

  if (updateError) return { success: false, error: updateError.message };

  // Update user's password change flag
  await supabase
    .from("users")
    .update({ has_changed_default_password: true })
    .eq("id", authUser.id);

  // Update organization status to 'active' on first password change
  if (
    userProfile.role === "organization_admin" &&
    userProfile.organization_id
  ) {
    await supabase
      .from("organizations")
      .update({ status: "active" })
      .eq("id", userProfile.organization_id)
      .eq("status", "draft"); // Only update if currently in draft status

    // Invalidate organization cache so the layout picks up the status change
    invalidateOrganizationCache(userProfile.organization_id);
  }

  invalidateUserCache(authUser.id);

  return { success: true, message: "Password updated successfully" };
}
