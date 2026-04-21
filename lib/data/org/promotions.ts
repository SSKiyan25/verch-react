// =============================================================================
// lib/data/org/promotions.ts
// Data fetchers for org promotions.
//
// NOTE: These functions do NOT use caching because the underlying RPCs
// (get_org_promotions, get_org_promotion_detail) use auth.uid() for
// authorization. This requires an authenticated Supabase client created
// with createClient() which calls cookies() - a dynamic API that cannot
// be used inside "use cache" scope.
//
// To enable caching in the future, the RPCs would need to be refactored to:
// 1. Accept p_user_id as a parameter instead of using auth.uid()
// 2. Verify user authorization via the parameter
// 3. Then an anon client can be used inside cached scope (see org/products.ts)
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import {
  fetchOrgPromotions,
  fetchOrgPromotionDetail,
} from "@/lib/supabase/queries/org-promotions";
import type {
  OrgPromotionFilters,
  OrgPromotionsResult,
  OrgPromotionDetail,
} from "@/lib/types/org-promotions";

// ─── Data Fetchers (Not Cached) ───────────────────────────────────────────────

/**
 * Get paginated list of promotions for an organization.
 * Validates user auth, then fetches via RPC.
 *
 * NOT CACHED: RPC uses auth.uid() which requires cookies() - incompatible with "use cache"
 */
export async function getCachedOrgPromotions(
  orgId: string,
  filters: OrgPromotionFilters,
  page: number,
  limit: number,
): Promise<OrgPromotionsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], totalCount: 0 };

  return fetchOrgPromotions(orgId, filters, page, limit);
}

/**
 * Get full detail of a single promotion.
 * Validates user auth, then fetches via RPC.
 *
 * NOT CACHED: RPC uses auth.uid() which requires cookies() - incompatible with "use cache"
 */
export async function getCachedOrgPromotionDetail(
  promotionId: string,
  orgId: string,
): Promise<OrgPromotionDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return fetchOrgPromotionDetail(promotionId, orgId);
}
