// lib/supabase/queries/org-product-orders.ts
// Types and raw fetch functions for Feature B product-order RPCs.
//
// Both RPCs use p_admin_user_id (not auth.uid()), so they can be called
// with an anon client inside "use cache" scope.
//
// See: .agent/learnings/nextjs/2026-04-16-cookies-in-cache-scope.md

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderStatus, PaymentStatus } from "./orders";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrgProductOrderItem = {
  order_id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  variation_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
  is_bundle_header: boolean;
  bundle_name: string;
};

export type OrgProductOrderSummary = {
  product_id: string;
  product_name: string;
  variation_count: number;
  total_orders: number;
  total_quantity: number;
  total_revenue: number;
  pending_count: number;
  completed_count: number;
  cancelled_count: number;
};

export type OrgOrdersByProductResult = {
  items: OrgProductOrderItem[];
  total_count: number;
};

export type OrgProductOrderFilters = {
  product_id?: string;
  variation_id?: string;
  sku?: string;
  status?: OrderStatus;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
};

export type OrgProductSummaryFilters = {
  date_from?: string;
  date_to?: string;
  search?: string;
  status?: string;
};

// ─── Raw Fetch Functions ──────────────────────────────────────────────────────

/**
 * Fetch a flat list of order items filtered/grouped by product.
 * Uses anon client — safe inside "use cache".
 */
export async function fetchOrgOrdersByProduct(
  supabase: SupabaseClient,
  adminUserId: string,
  orgId: string,
  filters: OrgProductOrderFilters = {},
): Promise<OrgOrdersByProductResult> {
  const {
    product_id,
    variation_id,
    sku,
    status,
    date_from,
    date_to,
    page = 1,
    page_size = 20,
  } = filters;

  const { data, error } = await supabase.rpc("get_org_orders_by_product", {
    p_admin_user_id: adminUserId,
    p_org_id: orgId,
    p_product_id: product_id ?? null,
    p_variation_id: variation_id ?? null,
    p_sku: sku ?? null,
    p_status: status ?? null,
    p_date_from: date_from ?? null,
    p_date_to: date_to ?? null,
    p_page: page,
    p_page_size: page_size,
  });

  if (error) {
    console.error("[fetchOrgOrdersByProduct] RPC error:", error.message);
    return { items: [], total_count: 0 };
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return { items: [], total_count: 0 };
  }

  const totalCount = Number(
    (data[0] as Record<string, unknown>).out_total_count ?? 0,
  );

  const items: OrgProductOrderItem[] = data.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      order_id: r.out_order_id as string,
      order_number: r.out_order_number as string,
      customer_name: r.out_customer_name as string,
      product_name: r.out_product_name as string,
      variation_name: r.out_variation_name as string,
      sku: r.out_sku as string,
      quantity: Number(r.out_quantity),
      unit_price: Number(r.out_unit_price),
      subtotal: Number(r.out_subtotal),
      order_status: r.out_order_status as OrderStatus,
      payment_status: r.out_payment_status as PaymentStatus,
      created_at: r.out_created_at as string,
      is_bundle_header: Boolean(r.out_is_bundle_header),
      bundle_name: r.out_bundle_name as string,
    };
  });

  return { items, total_count: totalCount };
}

/**
 * Fetch per-product aggregation for the product overview dashboard.
 * Uses anon client — safe inside "use cache".
 */
export async function fetchOrgProductOrderSummary(
  supabase: SupabaseClient,
  adminUserId: string,
  orgId: string,
  filters: OrgProductSummaryFilters = {},
): Promise<OrgProductOrderSummary[]> {
  const { date_from, date_to } = filters;

  const { data, error } = await supabase.rpc("get_org_product_order_summary", {
    p_admin_user_id: adminUserId,
    p_org_id: orgId,
    p_date_from: date_from ?? null,
    p_date_to: date_to ?? null,
  });

  if (error) {
    console.error("[fetchOrgProductOrderSummary] RPC error:", error.message);
    return [];
  }

  if (!data || !Array.isArray(data)) return [];

  return data.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      product_id: r.out_product_id as string,
      product_name: r.out_product_name as string,
      variation_count: Number(r.out_variation_count),
      total_orders: Number(r.out_total_orders),
      total_quantity: Number(r.out_total_quantity),
      total_revenue: Number(r.out_total_revenue),
      pending_count: Number(r.out_pending_count),
      completed_count: Number(r.out_completed_count),
      cancelled_count: Number(r.out_cancelled_count),
    };
  });
}
