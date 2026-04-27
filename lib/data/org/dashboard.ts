// lib/data/org/dashboard.ts
// Cached wrapper for the get_org_dashboard RPC.
//
// The RPC uses p_admin_user_id (not auth.uid()), so it can use
// an anon client inside "use cache" scope.
//
// See: .agent/learnings/nextjs/2026-04-16-cookies-in-cache-scope.md

import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { fetchOrgDashboard } from "@/lib/supabase/queries/org-dashboard";
import type { OrgDashboardData } from "@/lib/types/org-dashboard";

/**
 * Caching Strategy for Dashboard RPC:
 *
 * - get_org_dashboard: Uses p_admin_user_id (not auth.uid())
 *   → Can use anon client inside "use cache" ✅
 */

function getAnonClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Cached Wrapper ────────────────────────────────────────────────────────────

/**
 * Get cached dashboard data for a specific org.
 * Cache tagged per org for selective invalidation.
 *
 * Returns null if the user is not authenticated or the RPC fails.
 */
export async function getCachedOrgDashboard(
  adminUserId: string,
  orgId: string,
): Promise<OrgDashboardData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return _getOrgDashboardCached(adminUserId, orgId);
}

async function _getOrgDashboardCached(
  adminUserId: string,
  orgId: string,
): Promise<OrgDashboardData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`org-dashboard-${orgId}`);

  // Anon client is safe here because RPC does its own role/org check
  return fetchOrgDashboard(getAnonClient(), adminUserId, orgId);
}
