import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  InvoiceStatus,
} from "./orders";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrgOrderFilters = {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type OrgOrderListItem = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_avatar_url: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_amount: number;
  commission_amount: number;
  org_payout_amount: number;
  item_count: number;
  fulfillment_method: "pickup" | "delivery";
  created_at: string;
  updated_at: string;
};

export type OrgOrderItem = {
  id: string;
  variation_id: string | null;
  bundle_id: string | null;
  product_name: string;
  product_name_snapshot: string;
  variation_name: string | null;
  variation_name_snapshot: string | null;
  attributes: Record<string, unknown>;
  attributes_snapshot: Record<string, unknown>;
  quantity: number;
  unit_price: number;
  subtotal: number;
  commission_amount: number;
  is_bundle_header: boolean;
  is_pre_order: boolean;
  sku: string | null;
  bundle_instance_id: string | null;
  bundle_name_snapshot: string | null;
};

export type OrgOrderDetail = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_contact: string | null;
  customer_avatar_url: string | null;
  status: OrderStatus;
  fulfillment_method: "pickup" | "delivery";
  delivery_address: Record<string, unknown> | null;
  notes: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  commission_amount: number;
  org_payout_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  proof_path: string | null;
  proof_submitted_at: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_sequence_number: number | null;
  invoice_status: InvoiceStatus | null;
  invoice_pdf_path: string | null;
  invoice_issued_at: string | null;
  items: OrgOrderItem[];
  created_at: string;
  updated_at: string;
};

export type OrgOrdersResult = {
  orders: OrgOrderListItem[];
  total_count: number;
};

// ─── Raw Fetch Functions ──────────────────────────────────────────────────────

export async function fetchOrgOrders(
  supabase: SupabaseClient,
  adminUserId: string,
  orgId: string,
  filters: OrgOrderFilters = {},
): Promise<OrgOrdersResult> {
  const { status, paymentStatus, search, page = 1, pageSize = 15 } = filters;

  const { data, error } = await supabase.rpc("get_org_orders", {
    p_admin_user_id: adminUserId,
    p_org_id: orgId,
    p_status: status ?? null,
    p_payment_status: paymentStatus ?? null,
    p_page: page,
    p_page_size: pageSize,
    p_search: search ?? null,
  });

  if (error) {
    console.error("[fetchOrgOrders] RPC error:", error.message);
    return { orders: [], total_count: 0 };
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return { orders: [], total_count: 0 };
  }

  const totalCount = Number(
    (data[0] as Record<string, unknown>).out_total_count ?? 0,
  );

  const orders: OrgOrderListItem[] = data.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.out_order_id as string,
      order_number: r.out_order_number as string,
      customer_id: r.out_customer_id as string,
      customer_name: r.out_customer_name as string,
      customer_avatar_url: (r.out_customer_avatar_url as string) ?? null,
      status: r.out_status as OrderStatus,
      payment_method: r.out_payment_method as PaymentMethod,
      payment_status: r.out_payment_status as PaymentStatus,
      total_amount: Number(r.out_total_amount),
      commission_amount: Number(r.out_commission_amount),
      org_payout_amount: Number(r.out_org_payout_amount),
      item_count: Number(r.out_item_count),
      fulfillment_method: r.out_fulfillment_method as "pickup" | "delivery",
      created_at: r.out_created_at as string,
      updated_at: r.out_updated_at as string,
    };
  });

  return { orders, total_count: totalCount };
}

export async function fetchOrgOrderDetail(
  supabase: SupabaseClient,
  adminUserId: string,
  orderId: string,
): Promise<OrgOrderDetail | null> {
  const { data, error } = await supabase.rpc("get_order_detail", {
    p_user_id: adminUserId,
    p_order_id: orderId,
  });

  if (error) {
    console.error("[fetchOrgOrderDetail]", error.message);
    return null;
  }

  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const r = data[0] as Record<string, unknown>;

  const items: OrgOrderItem[] = ((r.out_items as unknown[]) ?? []).map(
    (item) => {
      const i = item as Record<string, unknown>;
      return {
        id: i.id as string,
        variation_id: (i.variation_id as string) ?? null,
        bundle_id: (i.bundle_id as string) ?? null,
        product_name: i.product_name_snapshot as string,
        product_name_snapshot: i.product_name_snapshot as string,
        variation_name: (i.variation_name_snapshot as string) ?? null,
        variation_name_snapshot: (i.variation_name_snapshot as string) ?? null,
        attributes: (i.attributes_snapshot as Record<string, unknown>) ?? {},
        attributes_snapshot:
          (i.attributes_snapshot as Record<string, unknown>) ?? {},
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        subtotal: Number(i.subtotal),
        commission_amount: Number(i.commission_amount ?? 0),
        is_bundle_header: Boolean(i.is_bundle_header),
        is_pre_order: Boolean(i.is_pre_order),
        sku: (i.sku as string) ?? null,
        bundle_instance_id: (i.bundle_instance_id as string) ?? null,
        bundle_name_snapshot: (i.bundle_name_snapshot as string) ?? null,
      };
    },
  );

  return {
    id: r.out_order_id as string,
    order_number: r.out_order_number as string,
    customer_id: r.out_customer_id as string,
    customer_name: r.out_customer_name as string,
    customer_contact: (r.out_customer_contact as string) ?? null,
    customer_avatar_url: (r.out_customer_avatar_url as string) ?? null,
    status: r.out_status as OrderStatus,
    fulfillment_method: r.out_fulfillment_method as "pickup" | "delivery",
    delivery_address:
      (r.out_delivery_address_snapshot as Record<string, unknown>) ?? null,
    notes: (r.out_notes as string) ?? null,
    cancellation_reason: (r.out_cancellation_reason as string) ?? null,
    cancelled_at: (r.out_cancelled_at as string) ?? null,
    subtotal: Number(r.out_subtotal ?? r.out_total_amount),
    discount_amount: Number(r.out_discount_amount ?? 0),
    total_amount: Number(r.out_total_amount),
    commission_amount: Number(r.out_commission_amount ?? 0),
    org_payout_amount: Number(r.out_org_payout_amount ?? r.out_total_amount),
    payment_method: r.out_payment_method as PaymentMethod,
    payment_status: r.out_payment_status as PaymentStatus,
    proof_path: (r.out_proof_path as string) ?? null,
    proof_submitted_at: (r.out_proof_submitted_at as string) ?? null,
    invoice_id: (r.out_invoice_id as string) ?? null,
    invoice_number: (r.out_invoice_number as string) ?? null,
    invoice_sequence_number:
      r.out_invoice_sequence_number != null
        ? Number(r.out_invoice_sequence_number)
        : null,
    invoice_status: (r.out_invoice_status as InvoiceStatus) ?? null,
    invoice_pdf_path: (r.out_invoice_pdf_path as string) ?? null,
    invoice_issued_at: (r.out_invoice_issued_at as string) ?? null,
    items,
    created_at: r.out_created_at as string,
    updated_at: r.out_updated_at as string,
  };
}
