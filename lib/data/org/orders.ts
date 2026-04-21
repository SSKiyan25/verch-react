import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import {
  fetchOrgOrders,
  fetchOrgOrderDetail,
  type OrgOrderFilters,
  type OrgOrdersResult,
  type OrgOrderDetail,
} from "@/lib/supabase/queries/org-orders";

/**
 * Caching Strategy for Org Orders:
 *
 * - get_org_orders: Uses p_user_id parameter (not auth.uid())
 *   → Can use anon client inside "use cache" ✅
 *
 * - get_order_detail: Uses auth.uid() internally
 *   → Cannot use "use cache" (cookies() forbidden) ❌
 *   → Pattern A: No caching, direct fetch with server client
 */
function getAnonClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Cached Wrappers ──────────────────────────────────────────────────────────

export async function getCachedOrgOrders(
  adminUserId: string,
  orgId: string,
  filters: OrgOrderFilters = {},
): Promise<OrgOrdersResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { orders: [], total_count: 0 };

  return _getOrgOrdersCached(adminUserId, orgId, filters);
}

async function _getOrgOrdersCached(
  adminUserId: string,
  orgId: string,
  filters: OrgOrderFilters,
): Promise<OrgOrdersResult> {
  "use cache";
  cacheLife("hours");
  cacheTag(`org-orders-${orgId}`);

  // Anon client is safe here because get_org_orders does its own role/org check
  return fetchOrgOrders(getAnonClient(), adminUserId, orgId, filters);
}

/**
 * Get detailed order information by ID.
 *
 * NOT CACHED: RPC uses auth.uid() which requires cookies()
 * - incompatible with "use cache"
 * - Pattern A: Remove caching for auth.uid() RPCs
 *
 * @see .agent/learnings/nextjs/2026-04-16-cookies-in-cache-scope.md
 */
export async function getCachedOrgOrderDetail(
  adminUserId: string,
  orderId: string,
  // orgId: string,
): Promise<OrgOrderDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Direct call to fetcher - no caching
  return fetchOrgOrderDetail(adminUserId, orderId);
}
