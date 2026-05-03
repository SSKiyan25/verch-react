// lib/data/org/analytics.ts
// Cached wrapper functions for org analytics data.
//
// All analytics RPCs accept p_admin_user_id (not auth.uid()), so they can
// be called with an anon client inside "use cache" scope — no cookies() inside.
//
// Pattern: Golden Rule #2 — createClient() is called in the public wrapper
// (outside "use cache"), then the inner _cached function uses the anon client.

import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import {
  fetchAnalyticsOverview,
  fetchAnalyticsRevenueOverTime,
  fetchAnalyticsOrdersByStatus,
  fetchAnalyticsTopProducts,
} from "@/lib/supabase/queries/org-analytics";
import type { AnalyticsData, AnalyticsGranularity } from "@/features/org/analytics/types";

function getAnonClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Public Wrapper ───────────────────────────────────────────────────────────

/**
 * Returns complete analytics data for an org across the given date range.
 * Verifies the caller's session before delegating to the cached inner function.
 *
 * Returns null if the user is not authenticated.
 */
export async function getCachedOrgAnalytics(
  orgId: string,
  orgSlug: string,
  startDate: string,
  endDate: string,
  granularity: AnalyticsGranularity = "day",
): Promise<AnalyticsData | null> {
  const supabase = await createClient(); // cookies() called safely outside "use cache"
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return _getOrgAnalyticsCached(
    user.id,
    orgId,
    orgSlug,
    startDate,
    endDate,
    granularity,
  );
}

// ─── Inner Cached Function ────────────────────────────────────────────────────

async function _getOrgAnalyticsCached(
  adminUserId: string,
  orgId: string,
  orgSlug: string,
  startDate: string,
  endDate: string,
  granularity: AnalyticsGranularity,
): Promise<AnalyticsData | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`org-analytics-${orgId}`);

  const supabase = getAnonClient(); // anon client — no cookies() here

  const [overview, revenueOverTime, ordersByStatus, topProducts] =
    await Promise.all([
      fetchAnalyticsOverview(supabase, adminUserId, orgId, startDate, endDate),
      fetchAnalyticsRevenueOverTime(
        supabase,
        adminUserId,
        orgId,
        startDate,
        endDate,
        granularity,
      ),
      fetchAnalyticsOrdersByStatus(
        supabase,
        adminUserId,
        orgId,
        startDate,
        endDate,
      ),
      fetchAnalyticsTopProducts(supabase, adminUserId, orgId, startDate, endDate),
    ]);

  if (!overview) return null;

  return {
    overview,
    revenue_over_time: revenueOverTime,
    orders_by_status: ordersByStatus,
    top_products: topProducts,
    date_range: { start: startDate, end: endDate, granularity },
    org_slug: orgSlug,
  };
}
