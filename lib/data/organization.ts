import { createAdminClient } from "@/lib/supabase/admin";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cachedQuery, CACHE_KEYS, getTag } from "@/lib/cache";
import {
  Organization,
  OrganizationRow,
  transformOrganizationRow,
} from "@/lib/types/organization";

export async function getCachedOrganization(
  orgId: string
): Promise<Organization | null> {
  return cachedQuery(
    async () => {
      // 👇 Use the Admin Client
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

      if (error) {
        console.error("Error fetching organization:", error);
        return null;
      }

      return transformOrganizationRow(data as OrganizationRow);
    },
    ["organizations", orgId], // Ensure this key matches your config
    [`organization-${orgId}`]
  );
}

// NOTE: The mutation below is NOT cached, so it can keep using the standard client
// if you want it to respect RLS policies, OR use admin if you want it purely server-side.
// For now, let's leave it as is or use the standard server client.
import { createClient } from "@/lib/supabase/server";

export async function activateOrganization(orgId: string) {
  const supabase = await createClient(); // This is fine, it's not inside cachedQuery
  await supabase
    .from("organizations")
    .update({ status: "active" })
    .eq("id", orgId);
}
