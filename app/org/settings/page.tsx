import { getUserSecurityStatus } from "@/app/actions/user-settings";
import { getCachedOrganization } from "@/lib/data/organization";
import OrganizationSettingsClient from "@/features/org/settings/general/components/OrganizationSettingsClient";

export default async function OrganizationSettingsPage() {
  // 1. Fetch Security Status (Server-side, hits Redis/Cache)
  const securityStatus = await getUserSecurityStatus();

  // 2. Fetch Organization (if we have an ID)
  let initialOrganization = null;
  if (securityStatus?.organizationId) {
    initialOrganization = await getCachedOrganization(
      securityStatus.organizationId
    );
  }

  // 3. Render the Client Component with PRE-LOADED data
  // The user will see this HTML immediately, no spinner.
  return (
    <OrganizationSettingsClient
      initialSecurityStatus={securityStatus}
      initialOrganization={initialOrganization}
    />
  );
}
