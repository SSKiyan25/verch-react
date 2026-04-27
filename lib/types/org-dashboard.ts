// lib/types/org-dashboard.ts
// Types for the Org Dashboard feature.

import type { OrderStatus } from "@/lib/supabase/queries/orders";

// ─── Stats ─────────────────────────────────────────────────────────────────────

export type OrgDashboardStats = {
  pending_orders: number;
  orders_today: number;
  revenue_today: number;
  payout_today: number;
  revenue_this_month: number;
  payout_this_month: number;
  active_products: number;
  pending_memberships: number;
};

// ─── Live Lists ────────────────────────────────────────────────────────────────

export type DashboardPendingOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  created_at: string;
};

export type DashboardPendingMembership = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  created_at: string;
};

export type DashboardRecentOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
};

// ─── Combined Dashboard Data ───────────────────────────────────────────────────

export type OrgDashboardData = {
  stats: OrgDashboardStats;
  pending_orders: DashboardPendingOrder[];
  pending_memberships: DashboardPendingMembership[];
  recent_orders: DashboardRecentOrder[];
};
