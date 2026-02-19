import { getUserSecurityStatus } from "@/app/actions/user-settings";
import { getCachedOrganization } from "@/lib/data/organization";
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

  // 2. Fetch Organization Data (Server Side - Hits Cache)
  const initialOrganization = await getCachedOrganization(
    securityStatus.organizationId
  );

  // 3. Render Client Component with PRE-LOADED Data
  return (
    <ProfileSettingsClient
      initialOrganization={initialOrganization}
      organizationId={securityStatus.organizationId}
    />
  );
}
