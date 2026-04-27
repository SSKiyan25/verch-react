// lib/data/org/product-orders.ts
// Cached wrappers for Feature B product-order RPCs.
//
// Both RPCs use p_admin_user_id (not auth.uid()), so they can use
// an anon client inside "use cache" scope.
//
// See: .agent/learnings/nextjs/2026-04-16-cookies-in-cache-scope.md

import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import {
  fetchOrgOrdersByProduct,
  fetchOrgProductOrderSummary,
  type OrgProductOrderFilters,
  type OrgProductSummaryFilters,
  type OrgOrdersByProductResult,
  type OrgProductOrderSummary,
} from "@/lib/supabase/queries/org-product-orders";

/**
 * Caching Strategy for Product-Order RPCs:
 *
 * - get_org_orders_by_product: Uses p_admin_user_id (not auth.uid())
 *   → Can use anon client inside "use cache" ✅
 *
 * - get_org_product_order_summary: Uses p_admin_user_id (not auth.uid())
 *   → Can use anon client inside "use cache" ✅
 */
function getAnonClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Cached Wrappers ──────────────────────────────────────────────────────────

/**
 * Get cached product-order items for a specific org.
 * Cache tagged per org for selective invalidation.
 */
export async function getCachedOrgOrdersByProduct(
  adminUserId: string,
  orgId: string,
  filters: OrgProductOrderFilters = {},
): Promise<OrgOrdersByProductResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], total_count: 0 };

  return _getOrgOrdersByProductCached(adminUserId, orgId, filters);
}

async function _getOrgOrdersByProductCached(
  adminUserId: string,
  orgId: string,
  filters: OrgProductOrderFilters,
): Promise<OrgOrdersByProductResult> {
  "use cache";
  cacheLife("hours");
  cacheTag(`org-product-orders-${orgId}`);

  // Anon client is safe here because RPC does its own role/org check
  return fetchOrgOrdersByProduct(getAnonClient(), adminUserId, orgId, filters);
}

/**
 * Get cached product-order summary for a specific org.
 * Cache tagged per org for selective invalidation.
 */
export async function getCachedOrgProductOrderSummary(
  adminUserId: string,
  orgId: string,
  filters: OrgProductSummaryFilters = {},
): Promise<OrgProductOrderSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  return _getOrgProductOrderSummaryCached(adminUserId, orgId, filters);
}

async function _getOrgProductOrderSummaryCached(
  adminUserId: string,
  orgId: string,
  filters: OrgProductSummaryFilters,
): Promise<OrgProductOrderSummary[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`org-product-summary-${orgId}`);

  // Anon client is safe here because RPC does its own role/org check
  return fetchOrgProductOrderSummary(
    getAnonClient(),
    adminUserId,
    orgId,
    filters,
  );
}
