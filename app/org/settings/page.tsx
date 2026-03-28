import { getUserSecurityStatus } from "@/app/actions/user-settings";
import {
  getCachedOrgSettings,
  transformOrgSettingsToOrganization,
} from "@/lib/data/org/settings";
import { createClient } from "@/lib/supabase/server";
import OrganizationSettingsClient from "@/features/org/settings/general/components/OrganizationSettingsClient";

export default async function OrganizationSettingsPage() {
  // 1. Fetch Security Status (Server-side, hits Redis/Cache)
  const securityStatus = await getUserSecurityStatus();

  // 2. Get authenticated user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3. Fetch Organization via authenticated RPC (if we have user and org ID)
  let initialOrganization = null;
  if (user && securityStatus?.organizationId) {
    const orgSettings = await getCachedOrgSettings(
      user.id,
      securityStatus.organizationId,
    );
    if (orgSettings) {
      initialOrganization = transformOrgSettingsToOrganization(orgSettings);
    }
  }

  // 4. Render the Client Component with PRE-LOADED data
  // The user will see this HTML immediately, no spinner.
  return (
    <OrganizationSettingsClient
      initialSecurityStatus={securityStatus}
      initialOrganization={initialOrganization}
    />
  );
}
