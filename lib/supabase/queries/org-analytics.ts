// lib/supabase/queries/org-analytics.ts
// Raw fetch functions for the org analytics RPCs.
//
// All RPCs accept p_admin_user_id so they can be called with the anon client
// safely inside "use cache" scope — no cookies() required.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AnalyticsOverview,
  RevenueDataPoint,
  OrderStatusBreakdown,
  TopProduct,
  AnalyticsGranularity,
} from "@/features/org/analytics/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Shifts a YYYY-MM-DD date string by `days` (negative = backwards). */
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function safePct(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 10000) / 100; // 2 dp
}

// ─── fetchAnalyticsOverview ───────────────────────────────────────────────────

/**
 * Calls get_org_analytics_overview twice (current period + equal prior period)
 * and returns a fully populated AnalyticsOverview including derived fields.
 */
export async function fetchAnalyticsOverview(
  supabase: SupabaseClient,
  adminUserId: string,
  orgId: string,
  startDate: string,
  endDate: string,
): Promise<AnalyticsOverview | null> {
  // Compute prior period of equal duration
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationDays =
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const prevEnd = shiftDate(startDate, -1);
  const prevStart = shiftDate(prevEnd, -(durationDays - 1));

  const [current, prev] = await Promise.all([
    supabase.rpc("get_org_analytics_overview", {
      p_admin_user_id: adminUserId,
      p_org_id: orgId,
      p_start_date: startDate,
      p_end_date: endDate,
    }),
    supabase.rpc("get_org_analytics_overview", {
      p_admin_user_id: adminUserId,
      p_org_id: orgId,
      p_start_date: prevStart,
      p_end_date: prevEnd,
    }),
  ]);

  if (current.error) {
    console.error("[fetchAnalyticsOverview] RPC error:", current.error.message);
    return null;
  }

  const row = (current.data as unknown[])[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  const prevRow = prev.error
    ? null
    : ((prev.data as unknown[])[0] as Record<string, unknown> | undefined) ??
      null;

  const totalRevenue = Number(row.out_total_revenue ?? 0);
  const totalOrders = Number(row.out_total_orders ?? 0);
  const prevRevenue = Number(prevRow?.out_total_revenue ?? 0);
  const prevOrders = Number(prevRow?.out_total_orders ?? 0);

  return {
    total_revenue: totalRevenue,
    total_orders: totalOrders,
    total_commission: Number(row.out_total_commission ?? 0),
    total_payout: Number(row.out_total_payout ?? 0),
    avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    prev_total_revenue: prevRevenue,
    prev_total_orders: prevOrders,
    revenue_change_pct: safePct(totalRevenue, prevRevenue),
    orders_change_pct: safePct(totalOrders, prevOrders),
  };
}

// ─── fetchAnalyticsRevenueOverTime ────────────────────────────────────────────

export async function fetchAnalyticsRevenueOverTime(
  supabase: SupabaseClient,
  adminUserId: string,
  orgId: string,
  startDate: string,
  endDate: string,
  granularity: AnalyticsGranularity,
): Promise<RevenueDataPoint[]> {
  const { data, error } = await supabase.rpc(
    "get_org_analytics_revenue_over_time",
    {
      p_admin_user_id: adminUserId,
      p_org_id: orgId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_granularity: granularity,
    },
  );

  if (error) {
    console.error(
      "[fetchAnalyticsRevenueOverTime] RPC error:",
      error.message,
    );
    return [];
  }

  return ((data as unknown[]) ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      period: String(r.out_period ?? ""),
      revenue: Number(r.out_revenue ?? 0),
      orders: Number(r.out_order_count ?? 0),
      payout: Number(r.out_payout ?? 0),
    };
  });
}

// ─── fetchAnalyticsOrdersByStatus ─────────────────────────────────────────────

export async function fetchAnalyticsOrdersByStatus(
  supabase: SupabaseClient,
  adminUserId: string,
  orgId: string,
  startDate: string,
  endDate: string,
): Promise<OrderStatusBreakdown[]> {
  const { data, error } = await supabase.rpc(
    "get_org_analytics_orders_by_status",
    {
      p_admin_user_id: adminUserId,
      p_org_id: orgId,
      p_start_date: startDate,
      p_end_date: endDate,
    },
  );

  if (error) {
    console.error(
      "[fetchAnalyticsOrdersByStatus] RPC error:",
      error.message,
    );
    return [];
  }

  return ((data as unknown[]) ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      status: String(r.out_status ?? ""),
      count: Number(r.out_count ?? 0),
      total_amount: Number(r.out_total_amount ?? 0),
    };
  });
}

// ─── fetchAnalyticsTopProducts ────────────────────────────────────────────────

export async function fetchAnalyticsTopProducts(
  supabase: SupabaseClient,
  adminUserId: string,
  orgId: string,
  startDate: string,
  endDate: string,
  limit = 10,
): Promise<TopProduct[]> {
  const { data, error } = await supabase.rpc(
    "get_org_analytics_top_products",
    {
      p_admin_user_id: adminUserId,
      p_org_id: orgId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: limit,
    },
  );

  if (error) {
    console.error("[fetchAnalyticsTopProducts] RPC error:", error.message);
    return [];
  }

  return ((data as unknown[]) ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      product_name: String(r.out_product_name ?? ""),
      revenue: Number(r.out_revenue ?? 0),
      order_count: Number(r.out_order_count ?? 0),
      quantity_sold: Number(r.out_quantity_sold ?? 0),
    };
  });
}
