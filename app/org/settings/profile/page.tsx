import { getUserSecurityStatus } from "@/app/actions/user-settings";
import {
  getCachedOrgSettings,
  transformOrgSettingsToOrganization,
} from "@/lib/data/org/settings";
import { createClient } from "@/lib/supabase/server";
import ProfileSettingsClient from "@/features/org/settings/profile/components/ProfileSettingsClient";

export default async function ProfileSettingsPage() {
  // 1. Fetch User & Organization ID (Server Side - Fast)
  const securityStatus = await getUserSecurityStatus();

  // Handle edge case: User has no organization or is not logged in
  if (!securityStatus?.organizationId) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h3 className="text-lg font-semibold">Organization not found</h3>
        <p className="text-muted-foreground">
          Please contact support or create an organization.
        </p>
      </div>
    );
  }

  // 2. Get authenticated user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3. Fetch Organization Data via authenticated RPC (Server Side - Hits Cache)
  let initialOrganization = null;
  if (user) {
    // console.log(
    //   "[ProfileSettingsPage] Fetching org settings at:",
    //   new Date().toISOString(),
    // );
    const orgSettings = await getCachedOrgSettings(
      user.id,
      securityStatus.organizationId,
    );
    if (orgSettings) {
      initialOrganization = transformOrgSettingsToOrganization(orgSettings);
      console.log(
        "[ProfileSettingsPage] Fetched org with logo:",
        initialOrganization.logo_image_url,
      );
    }
  }

  // 4. Render Client Component with PRE-LOADED Data
  // Use a key that changes when image data changes to force re-render
  const componentKey = initialOrganization
    ? `${initialOrganization.id}-${initialOrganization.logo_image_url}-${initialOrganization.cover_image_url}-${JSON.stringify(initialOrganization.images_url)}`
    : "no-org";

  return (
    <ProfileSettingsClient
      key={componentKey}
      initialOrganization={initialOrganization}
      organizationId={securityStatus.organizationId}
    />
  );
}
