import { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type PaymentMethod = "cash" | "gcash";
export type PaymentStatus =
  | "pending"
  | "proof_submitted"
  | "confirmed"
  | "rejected";
export type InvoiceStatus = "draft" | "issued" | "void";
export type FulfillmentMethod = "pickup" | "delivery";
export type DiscountType = "percentage" | "fixed";
export type TriggerType = "auto" | "voucher";

export type UserOrderListItem = {
  order_id: string;
  org_id: string;
  org_name: string;
  org_logo_url: string | null;
  status: OrderStatus;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  fulfillment_method: FulfillmentMethod;
  item_count: number;
  created_at: string;
  total_count: number;
};

export type OrderDetailItem = {
  id: string;
  variation_id: string | null;
  bundle_instance_id: string | null;
  is_bundle_header: boolean;
  bundle_id: string | null;
  bundle_name_snapshot: string | null;
  product_name_snapshot: string;
  variation_name_snapshot: string | null;
  attributes_snapshot: Record<string, unknown> | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
  commission_amount: number;
  is_pre_order: boolean;
};

export type OrderDetailPromotion = {
  promotion_id: string;
  name: string;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  trigger_type: TriggerType;
  voucher_code: string | null;
};

export type OrderDetail = {
  order_id: string;
  org_id: string;
  org_name: string;
  status: OrderStatus;
  fulfillment_method: FulfillmentMethod;
  delivery_address_snapshot: Record<string, unknown> | null;
  subtotal: number;
  discount_amount: number;
  commission_rate: number;
  commission_amount: number;
  total_amount: number;
  org_payout_amount: number;
  notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  items: OrderDetailItem[];
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  proof_path: string | null;
  rejection_note: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_status: InvoiceStatus | null;
  invoice_pdf_path: string | null;
  promotions: OrderDetailPromotion[];
};

export type OrgOrderListItem = {
  order_id: string;
  customer_id: string;
  customer_name: string;
  status: OrderStatus;
  total_amount: number;
  commission_amount: number;
  org_payout_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  fulfillment_method: FulfillmentMethod;
  item_count: number;
  created_at: string;
  total_count: number;
};

export type ApplicablePromotion = {
  promotion_id: string;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order_amount: number | null;
  is_eligible: boolean;
  ineligible_reason: string | null;
};

export type VoucherValidationResult = {
  promotion_id: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order_amount: number | null;
  is_valid: boolean;
  invalid_reason: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseJsonField<T>(value: unknown): T {
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return value as T;
}

// ─── Query Functions ──────────────────────────────────────────────────────────

export async function fetchUserOrders(
  supabase: SupabaseClient,
  userId: string,
  status?: OrderStatus,
  page?: number,
  pageSize?: number,
): Promise<UserOrderListItem[]> {
  const { data, error } = await supabase.rpc("get_user_orders", {
    p_user_id: userId,
    p_status: status ?? null,
    p_page: page ?? 1,
    p_page_size: pageSize ?? 10,
  });

  if (error) throw error;
  if (!data) return [];

  const rows = data as Record<string, unknown>[];

  return rows.map((row) => ({
    order_id: row.out_order_id as string,
    org_id: row.out_org_id as string,
    org_name: row.out_org_name as string,
    org_logo_url: (row.out_org_logo_url as string) ?? null,
    status: row.out_status as OrderStatus,
    total_amount: Number(row.out_total_amount),
    payment_method: row.out_payment_method as PaymentMethod,
    payment_status: row.out_payment_status as PaymentStatus,
    fulfillment_method: row.out_fulfillment_method as FulfillmentMethod,
    item_count: row.out_item_count as number,
    created_at: row.out_created_at as string,
    total_count: row.out_total_count as number,
  }));
}

export async function fetchOrderDetail(
  supabase: SupabaseClient,
  userId: string,
  orderId: string,
): Promise<OrderDetail> {
  const { data, error } = await supabase.rpc("get_order_detail", {
    p_user_id: userId,
    p_order_id: orderId,
  });

  if (error) throw error;
  if (!data) throw new Error(`Order ${orderId} not found`);

  const rows = data as Record<string, unknown>[];
  if (!rows.length) throw new Error(`Order ${orderId} not found`);

  const row = rows[0];

  const items = parseJsonField<OrderDetailItem[]>(row.out_items ?? []).map(
    (item: OrderDetailItem) => ({
      id: item.id,
      variation_id: item.variation_id ?? null,
      bundle_instance_id: item.bundle_instance_id ?? null,
      is_bundle_header: item.is_bundle_header ?? false,
      bundle_id: item.bundle_id ?? null,
      bundle_name_snapshot: item.bundle_name_snapshot ?? null,
      product_name_snapshot: item.product_name_snapshot,
      variation_name_snapshot: item.variation_name_snapshot ?? null,
      attributes_snapshot: item.attributes_snapshot ?? null,
      unit_price: Number(item.unit_price),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
      commission_amount: Number(item.commission_amount),
      is_pre_order: item.is_pre_order ?? false,
    }),
  );

  const promotions = parseJsonField<OrderDetailPromotion[]>(
    row.out_promotions ?? [],
  ).map((p: OrderDetailPromotion) => ({
    promotion_id: p.promotion_id,
    name: p.name,
    discount_type: p.discount_type,
    discount_value: Number(p.discount_value),
    discount_amount: Number(p.discount_amount),
    trigger_type: p.trigger_type,
    voucher_code: p.voucher_code ?? null,
  }));

  return {
    order_id: row.out_order_id as string,
    org_id: row.out_org_id as string,
    org_name: row.out_org_name as string,
    status: row.out_status as OrderStatus,
    fulfillment_method: row.out_fulfillment_method as FulfillmentMethod,
    delivery_address_snapshot:
      row.out_delivery_address_snapshot != null
        ? parseJsonField<Record<string, unknown>>(
            row.out_delivery_address_snapshot,
          )
        : null,
    subtotal: Number(row.out_subtotal),
    discount_amount: Number(row.out_discount_amount),
    commission_rate: Number(row.out_commission_rate),
    commission_amount: Number(row.out_commission_amount),
    total_amount: Number(row.out_total_amount),
    org_payout_amount: Number(row.out_org_payout_amount),
    notes: (row.out_notes as string) ?? null,
    cancelled_at: (row.out_cancelled_at as string) ?? null,
    cancellation_reason: (row.out_cancellation_reason as string) ?? null,
    created_at: row.out_created_at as string,
    items,
    payment_method: row.out_payment_method as PaymentMethod,
    payment_status: row.out_payment_status as PaymentStatus,
    proof_path: (row.out_proof_path as string) ?? null,
    rejection_note: (row.out_rejection_note as string) ?? null,
    invoice_id: (row.out_invoice_id as string) ?? null,
    invoice_number: (row.out_invoice_number as string) ?? null,
    invoice_status: (row.out_invoice_status as InvoiceStatus) ?? null,
    invoice_pdf_path: (row.out_invoice_pdf_path as string) ?? null,
    promotions,
  };
}

export async function fetchOrgOrders(
  supabase: SupabaseClient,
  adminUserId: string,
  orgId: string,
  status?: OrderStatus,
  paymentStatus?: PaymentStatus,
  page?: number,
  pageSize?: number,
  search?: string,
): Promise<OrgOrderListItem[]> {
  const { data, error } = await supabase.rpc("get_org_orders", {
    p_admin_user_id: adminUserId,
    p_org_id: orgId,
    p_status: status ?? null,
    p_payment_status: paymentStatus ?? null,
    p_page: page ?? 1,
    p_page_size: pageSize ?? 10,
    p_search: search ?? null,
  });

  if (error) throw error;
  if (!data) return [];

  const rows = data as Record<string, unknown>[];

  return rows.map((row) => ({
    order_id: row.out_order_id as string,
    customer_id: row.out_customer_id as string,
    customer_name: row.out_customer_name as string,
    status: row.out_status as OrderStatus,
    total_amount: Number(row.out_total_amount),
    commission_amount: Number(row.out_commission_amount),
    org_payout_amount: Number(row.out_org_payout_amount),
    payment_method: row.out_payment_method as PaymentMethod,
    payment_status: row.out_payment_status as PaymentStatus,
    fulfillment_method: row.out_fulfillment_method as FulfillmentMethod,
    item_count: row.out_item_count as number,
    created_at: row.out_created_at as string,
    total_count: row.out_total_count as number,
  }));
}

export async function fetchApplicablePromotions(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  cartItemIds: string[],
): Promise<ApplicablePromotion[]> {
  const { data, error } = await supabase.rpc("get_applicable_promotions", {
    p_user_id: userId,
    p_org_id: orgId,
    p_cart_item_ids: cartItemIds,
  });

  if (error) throw error;
  if (!data) return [];

  const rows = data as Record<string, unknown>[];

  return rows.map((row) => ({
    promotion_id: row.out_promotion_id as string,
    name: row.out_name as string,
    description: (row.out_description as string) ?? null,
    trigger_type: row.out_trigger_type as TriggerType,
    discount_type: row.out_discount_type as DiscountType,
    discount_value: Number(row.out_discount_value),
    minimum_order_amount:
      row.out_minimum_order_amount != null
        ? Number(row.out_minimum_order_amount)
        : null,
    is_eligible: row.out_is_eligible as boolean,
    ineligible_reason: (row.out_ineligible_reason as string) ?? null,
  }));
}

export async function validateVoucherCode(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  voucherCode: string,
  cartItemIds: string[],
): Promise<VoucherValidationResult> {
  const { data, error } = await supabase.rpc("validate_voucher_code", {
    p_user_id: userId,
    p_org_id: orgId,
    p_voucher_code: voucherCode,
    p_cart_item_ids: cartItemIds,
  });

  if (error) throw error;
  if (!data) throw new Error("No response from validate_voucher_code");

  const rows = data as Record<string, unknown>[];
  if (!rows.length) throw new Error("No response from validate_voucher_code");

  const row = rows[0];

  return {
    promotion_id: row.out_promotion_id as string,
    discount_type: row.out_discount_type as DiscountType,
    discount_value: Number(row.out_discount_value),
    minimum_order_amount:
      row.out_minimum_order_amount != null
        ? Number(row.out_minimum_order_amount)
        : null,
    is_valid: row.out_is_valid as boolean,
    invalid_reason: (row.out_invalid_reason as string) ?? null,
  };
}
