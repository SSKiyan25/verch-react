import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOrganizationUser } from "@/lib/utils/org-helpers";
import { OrgShell } from "@/components/layouts/org-shell";

// 👇 Use the consistent Data Layer functions
import { getCachedUserProfile } from "@/lib/data/user";
import {
  getCachedOrganization,
  activateOrganization,
} from "@/lib/data/organization";

export default async function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log("[OrgLayout] Rendering Organization Layout...");
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    console.error("Authentication error:", authError);
    redirect("/login");
  }

  // 2. Fetch Profile (Uses cachedQuery)
  const userProfile = await getCachedUserProfile(authUser.id);

  if (!userProfile || !isOrganizationUser(userProfile.role)) {
    console.error("User profile invalid or lacks organization role");
    redirect("/login");
  }

  if (!userProfile.organization_id) {
    // Handle edge case: User has role but no org ID
    console.error("User has org role but no organization_id");
    redirect("/login");
  }

  // 3. Fetch Organization (Uses cachedQuery + Transformer)
  const organization = await getCachedOrganization(userProfile.organization_id);

  if (!organization) {
    console.error(
      "Organization not found for ID:",
      userProfile.organization_id
    );
    redirect("/login");
  }

  // 4. Handle "Draft -> Active" Transition
  if (organization.status === "draft") {
    // This is a fire-and-forget server-side update
    await activateOrganization(userProfile.organization_id);
  }

  // 5. Prepare User Object for UI
  const currentUser = {
    name: userProfile.full_name || authUser.email || "User",
    email: authUser.email || "",
    avatar: userProfile.avatar_url || "",
    role: userProfile.role,
  };

  console.log("[OrgLayout] User and Organization data", {
    currentUser,
    organization: {
      id: organization.id,
      name: organization.name,
      status: organization.status,
      is_setup_complete: organization.is_setup_complete,
    },
  });
  return (
    <OrgShell
      user={currentUser}
      isSetupComplete={organization.is_setup_complete}
    >
      {children}
    </OrgShell>
  );
}
