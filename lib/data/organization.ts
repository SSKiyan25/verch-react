import { cacheLife, cacheTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server"; // For mutations
import {
  Organization,
  OrganizationRow,
  transformOrganizationRow,
} from "@/lib/types/organization";

// ✅ READ: Fully Cached
export async function getCachedOrganization(
  orgId: string,
): Promise<Organization | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`organization-${orgId}`);

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
}

// ⚠️ MUTATION: Called during layout render (auto-activation logic)
// Do NOT call revalidateTag here - this runs during render which is forbidden
// Cache will expire naturally via cacheLife("hours")
export async function activateOrganization(orgId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("organizations")
    .update({ status: "active" })
    .eq("id", orgId);

  if (error) throw error;

  // Note: No cache invalidation here because this is called during render
  // If explicit cache invalidation is needed, move this to a Server Action
}
