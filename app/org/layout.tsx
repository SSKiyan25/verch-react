import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOrganizationUser } from "@/lib/utils/org-helpers";
import { OrgShell } from "@/components/layouts/org-shell";
import { Skeleton } from "@/components/ui/skeleton";

// 👇 Use the consistent Data Layer functions
import { getCachedUserProfile } from "@/lib/data/user";
import { getCachedOrganization } from "@/lib/data/organization";

async function OrgLayoutContent({ children }: { children: React.ReactNode }) {
  console.log("[OrgLayout] Rendering Organization Layout...");
  console.log("Checking authentication and organization status...");
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
      userProfile.organization_id,
    );
    redirect("/login");
  }

  // 4. Prepare User Object for UI
  const currentUser = {
    name: userProfile.full_name || authUser.email || "User",
    email: authUser.email || "",
    avatar: userProfile.avatar_url || "",
    role: userProfile.role,
  };

  // 5. Determine if password change is required
  // Only organization admins need to change default password
  const isOrgAdmin = userProfile.role === "organization_admin";
  const hasChangedPassword = userProfile.has_changed_default_password ?? false;
  const requiresPasswordChange = isOrgAdmin && !hasChangedPassword;

  return (
    <OrgShell
      user={currentUser}
      requiresPasswordChange={requiresPasswordChange}
      organizationLogo={organization.logo_image_url}
    >
      {children}
    </OrgShell>
  );
}

function OrganizationLayoutFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
      </div>
    </div>
  );
}

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<OrganizationLayoutFallback />}>
      <OrgLayoutContent>{children}</OrgLayoutContent>
    </Suspense>
  );
}
