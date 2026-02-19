import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server"; // For mutations
import { cachedQuery, CACHE_KEYS, getTag } from "@/lib/cache";
import { revalidateTag } from "next/cache";
import {
  Organization,
  OrganizationRow,
  transformOrganizationRow,
} from "@/lib/types/organization";

// ✅ READ: Fully Cached
export async function getCachedOrganization(
  orgId: string
): Promise<Organization | null> {
  return cachedQuery(
    async () => {
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
    // 👇 Use your CENTRALIZED keys (don't hardcode strings)
    CACHE_KEYS.organizations.byId(orgId),
    [getTag(CACHE_KEYS.organizations.byId(orgId))]
  );
}

export async function activateOrganization(orgId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("organizations")
    .update({ status: "active" })
    .eq("id", orgId);

  if (error) throw error;

  console.log(`[Cache] Invalidating organization: ${orgId}`);

  revalidateTag(getTag(CACHE_KEYS.organizations.byId(orgId)), "default");
}
