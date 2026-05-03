// features/org/analytics/types.ts
// All shared TypeScript types for the Org Analytics Dashboard.
// These types mirror the out_ columns from the analytics RPCs.

// ─── Date Range ───────────────────────────────────────────────────────────────

export type AnalyticsGranularity = "day" | "week" | "month";

export type AnalyticsDateRange = {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  granularity: AnalyticsGranularity;
};

// ─── KPI Overview ─────────────────────────────────────────────────────────────
// Maps to: get_org_analytics_overview RPC
// Excludes cancelled orders from revenue/count aggregates.

export type AnalyticsOverview = {
  total_revenue: number; // SUM(total_amount) WHERE status != 'cancelled'
  total_orders: number; // COUNT(*) WHERE status != 'cancelled'
  total_commission: number; // SUM(commission_amount) WHERE status != 'cancelled'
  total_payout: number; // SUM(org_payout_amount) WHERE status != 'cancelled'
  avg_order_value: number; // total_revenue / total_orders (0 if no orders)
  prev_total_revenue: number; // same for prior period (for % change)
  prev_total_orders: number;
  revenue_change_pct: number | null; // null if no prior period data
  orders_change_pct: number | null;
};

// ─── Revenue Over Time ────────────────────────────────────────────────────────
// Maps to: get_org_analytics_revenue_over_time RPC

export type RevenueDataPoint = {
  period: string; // date string — YYYY-MM-DD (day), YYYY-WW (week), YYYY-MM (month)
  revenue: number;
  orders: number;
  payout: number;
};

// ─── Orders by Status ─────────────────────────────────────────────────────────
// Maps to: get_org_analytics_orders_by_status RPC
// ALL statuses are included here (including cancelled).

export type OrderStatusBreakdown = {
  status: string; // order_status enum value
  count: number;
  total_amount: number;
};

// ─── Top Products ─────────────────────────────────────────────────────────────
// Maps to: get_org_analytics_top_products RPC

export type TopProduct = {
  product_name: string;
  quantity_sold: number;
  revenue: number;
  order_count: number;
};

// ─── Aggregate Payload ────────────────────────────────────────────────────────
// Full payload returned by getAnalyticsData server action.

export type AnalyticsData = {
  overview: AnalyticsOverview;
  revenue_over_time: RevenueDataPoint[];
  orders_by_status: OrderStatusBreakdown[];
  top_products: TopProduct[];
  date_range: AnalyticsDateRange;
  org_slug: string; // used for export file naming
};

// ─── Server Action Result ─────────────────────────────────────────────────────

export type AnalyticsActionResult =
  | { success: true; data: AnalyticsData }
  | { success: false; error: string };
