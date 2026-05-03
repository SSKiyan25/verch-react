import { cacheLife, cacheTag } from "next/cache";
import {
  fetchOrgGcashConfig,
  type OrgGcashConfig,
} from "@/lib/supabase/queries/org-gcash";

/**
 * Cached wrapper for org GCash config.
 * Pattern B (public data): uses anon client inside "use cache" — no auth needed.
 * Customers use this at checkout to determine if GCash payment is available.
 */
export async function getCachedOrgGcashConfig(
  orgId: string,
): Promise<OrgGcashConfig | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`org-gcash-${orgId}`);

  return fetchOrgGcashConfig(orgId);
}
