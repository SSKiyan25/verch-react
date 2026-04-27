// lib/supabase/queries/org-dashboard.ts
// Raw fetch function for the get_org_dashboard RPC.
//
// The RPC uses p_admin_user_id (not auth.uid()), so it can be called
// with an anon client inside "use cache" scope.
//
// See: .agent/learnings/nextjs/2026-04-16-cookies-in-cache-scope.md

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OrgDashboardData,
  OrgDashboardStats,
  DashboardPendingOrder,
  DashboardPendingMembership,
  DashboardRecentOrder,
} from "@/lib/types/org-dashboard";

// ─── Raw Fetch Function ────────────────────────────────────────────────────────

/**
 * Fetch all dashboard data for an organization in a single RPC call.
 * Uses anon client — safe inside "use cache".
 *
 * Returns null if the RPC fails or returns no data.
 */
export async function fetchOrgDashboard(
  supabase: SupabaseClient,
  adminUserId: string,
  orgId: string,
): Promise<OrgDashboardData | null> {
  const { data, error } = await supabase.rpc("get_org_dashboard", {
    p_admin_user_id: adminUserId,
    p_org_id: orgId,
  });

  if (error) {
    console.error("[fetchOrgDashboard] RPC error:", error.message);
    return null;
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row = data[0] as Record<string, unknown>;

  // ── Map stats ──────────────────────────────────────────────────────────────
  const stats: OrgDashboardStats = {
    pending_orders: Number(row.out_pending_orders ?? 0),
    orders_today: Number(row.out_orders_today ?? 0),
    revenue_today: Number(row.out_revenue_today ?? 0),
    payout_today: Number(row.out_payout_today ?? 0),
    revenue_this_month: Number(row.out_revenue_this_month ?? 0),
    payout_this_month: Number(row.out_payout_this_month ?? 0),
    active_products: Number(row.out_active_products ?? 0),
    pending_memberships: Number(row.out_pending_memberships ?? 0),
  };

  // ── Map pending orders list ────────────────────────────────────────────────
  const pendingOrders: DashboardPendingOrder[] =
    parseJsonbArray<DashboardPendingOrder>(row.out_pending_orders_list);

  // ── Map pending memberships list ───────────────────────────────────────────
  const pendingMemberships: DashboardPendingMembership[] =
    parseJsonbArray<DashboardPendingMembership>(
      row.out_pending_memberships_list,
    );

  // ── Map recent orders list ─────────────────────────────────────────────────
  const recentOrders: DashboardRecentOrder[] =
    parseJsonbArray<DashboardRecentOrder>(row.out_recent_orders_list);

  return {
    stats,
    pending_orders: pendingOrders,
    pending_memberships: pendingMemberships,
    recent_orders: recentOrders,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Safely parse a JSONB column from the RPC result into a typed array.
 * Returns an empty array if the value is null, undefined, or not an array.
 */
function parseJsonbArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  // If the JSONB came back as a string (edge case), try parsing it
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}
