// =============================================================================
// lib/supabase/queries/org-promotions.ts
// Raw fetchers for org promotions RPCs.
// Each fetcher:
//   - Creates its own authenticated Supabase client internally
//   - Calls the RPC with typed params (RPCs use auth.uid() for authorization)
//   - Maps out_* keys → clean TypeScript keys
//   - Throws on error (let the cached wrapper / page handle it)
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  OrgPromotionListItem,
  OrgPromotionDetail,
  OrgPromotionsResult,
  OrgPromotionFilters,
  PromotionTarget,
  PromotionGiftItem,
  PromotionEligibilityRule,
  PromotionStatus,
  PromotionTriggerType,
  PromotionTargetType,
  PromotionDiscountType,
  EligibilityRuleType,
} from "@/lib/types/org-promotions";

// ---------------------------------------------------------------------------
// Internal helpers — map RPC row shapes (out_* prefix) to clean types
// ---------------------------------------------------------------------------

function mapListItem(row: Record<string, unknown>): OrgPromotionListItem {
  return {
    id: row.out_id as string,
    name: row.out_name as string,
    description: (row.out_description as string | null) ?? null,
    status: row.out_status as PromotionStatus,
    trigger_type: row.out_trigger_type as PromotionTriggerType,
    voucher_code: (row.out_voucher_code as string | null) ?? null,
    target_type: row.out_target_type as PromotionTargetType,
    discount_type: row.out_discount_type as PromotionDiscountType,
    discount_value:
      row.out_discount_value != null ? Number(row.out_discount_value) : null,
    minimum_order_amount: Number(row.out_minimum_order_amount ?? 0),
    total_uses_cap:
      row.out_total_uses_cap != null ? Number(row.out_total_uses_cap) : null,
    total_uses_count: Number(row.out_total_uses_count ?? 0),
    starts_at: (row.out_starts_at as string | null) ?? null,
    ends_at: (row.out_ends_at as string | null) ?? null,
    created_at: row.out_created_at as string,
    updated_at: row.out_updated_at as string,
  };
}

function mapTarget(t: Record<string, unknown>): PromotionTarget {
  return {
    id: t.id as string,
    product_id: (t.product_id as string | null) ?? null,
    product_name: (t.product_name as string | null) ?? null,
    organization_id: (t.organization_id as string | null) ?? null,
    organization_name: (t.organization_name as string | null) ?? null,
  };
}

function mapGiftItem(g: Record<string, unknown> | null): PromotionGiftItem {
  if (!g) return null;
  return {
    id: g.id as string,
    variation_id: g.variation_id as string,
    variation_name: (g.variation_name as string | null) ?? null,
    product_name: (g.product_name as string | null) ?? null,
    quantity: Number(g.quantity ?? 1),
  };
}

function mapEligibilityRule(
  r: Record<string, unknown>,
): PromotionEligibilityRule {
  return {
    id: r.id as string,
    rule_type: r.rule_type as EligibilityRuleType,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  };
}

function mapDetail(row: Record<string, unknown>): OrgPromotionDetail {
  const rawTargets =
    (row.out_targets as Array<Record<string, unknown>> | null) ?? [];
  const rawGiftItem =
    (row.out_gift_item as Record<string, unknown> | null) ?? null;
  const rawRules =
    (row.out_eligibility_rules as Array<Record<string, unknown>> | null) ?? [];

  return {
    id: row.out_id as string,
    name: row.out_name as string,
    description: (row.out_description as string | null) ?? null,
    status: row.out_status as PromotionStatus,
    trigger_type: row.out_trigger_type as PromotionTriggerType,
    voucher_code: (row.out_voucher_code as string | null) ?? null,
    target_type: row.out_target_type as PromotionTargetType,
    discount_type: row.out_discount_type as PromotionDiscountType,
    discount_value:
      row.out_discount_value != null ? Number(row.out_discount_value) : null,
    minimum_order_amount: Number(row.out_minimum_order_amount ?? 0),
    total_uses_cap:
      row.out_total_uses_cap != null ? Number(row.out_total_uses_cap) : null,
    total_uses_count: Number(row.out_total_uses_count ?? 0),
    starts_at: (row.out_starts_at as string | null) ?? null,
    ends_at: (row.out_ends_at as string | null) ?? null,
    created_by: (row.out_created_by as string | null) ?? null,
    created_by_name: (row.out_created_by_name as string | null) ?? null,
    created_at: row.out_created_at as string,
    updated_at: row.out_updated_at as string,
    targets: rawTargets.map(mapTarget),
    gift_item: mapGiftItem(rawGiftItem),
    eligibility_rules: rawRules.map(mapEligibilityRule),
  };
}

// ---------------------------------------------------------------------------
// fetchOrgPromotions
// Calls: get_org_promotions RPC
// Used by: getCachedOrgPromotions (lib/data/org/promotions.ts)
// ---------------------------------------------------------------------------

export async function fetchOrgPromotions(
  orgId: string,
  filters: OrgPromotionFilters,
  page: number,
  limit: number,
): Promise<OrgPromotionsResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_org_promotions", {
    p_org_id: orgId,
    p_page: page,
    p_limit: limit,
    p_status: filters.status ?? null,
    p_trigger_type: filters.triggerType ?? null,
    p_search: filters.search ?? null,
  });

  if (error) {
    console.error("[fetchOrgPromotions] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];

  if (rows.length === 0) {
    return { items: [], totalCount: 0 };
  }

  const totalCount = Number(rows[0].out_total_count ?? 0);
  const items = rows.map(mapListItem);

  return { items, totalCount };
}

// ---------------------------------------------------------------------------
// fetchOrgPromotionDetail
// Calls: get_org_promotion_detail RPC
// Used by: getOrgPromotionDetail (lib/data/org/promotions.ts)
// ---------------------------------------------------------------------------

export async function fetchOrgPromotionDetail(
  promotionId: string,
  orgId: string,
): Promise<OrgPromotionDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_org_promotion_detail", {
    p_promotion_id: promotionId,
    p_org_id: orgId,
  });

  if (error) {
    // RPC raises 'Promotion not found' — treat as null instead of throwing
    if (error.message.includes("not found")) return null;
    console.error("[fetchOrgPromotionDetail] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) return null;

  return mapDetail(rows[0]);
}

// ---------------------------------------------------------------------------
// Mutation fetchers — called directly from Server Actions
// These don't need caching, but follow the same pattern for consistency
// ---------------------------------------------------------------------------

export type CreatePromotionParams = {
  orgId: string;
  name: string;
  description?: string | null;
  triggerType?: string;
  voucherCode?: string | null;
  targetType?: string;
  discountType?: string;
  discountValue?: number | null;
  minimumOrderAmount?: number;
  totalUsesCap?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  targetProductIds?: string[] | null;
  giftVariationId?: string | null;
  giftQuantity?: number;
  eligibilityRules?: Array<{
    rule_type: string;
    metadata?: Record<string, unknown>;
  }>;
};

export type CreatePromotionResult = {
  id: string;
  name: string;
  status: string;
};

export async function createPromotion(
  params: CreatePromotionParams,
): Promise<CreatePromotionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_promotion", {
    p_org_id: params.orgId,
    p_name: params.name,
    p_description: params.description ?? null,
    p_trigger_type: params.triggerType ?? "auto",
    p_voucher_code: params.voucherCode ?? null,
    p_target_type: params.targetType ?? "order",
    p_discount_type: params.discountType ?? "percentage",
    p_discount_value: params.discountValue ?? null,
    p_minimum_order_amount: params.minimumOrderAmount ?? 0,
    p_total_uses_cap: params.totalUsesCap ?? null,
    p_starts_at: params.startsAt ?? null,
    p_ends_at: params.endsAt ?? null,
    p_target_product_ids: params.targetProductIds ?? null,
    p_gift_variation_id: params.giftVariationId ?? null,
    p_gift_quantity: params.giftQuantity ?? 1,
    p_eligibility_rules: params.eligibilityRules
      ? JSON.stringify(params.eligibilityRules)
      : "[]",
  });

  if (error) {
    console.error("[createPromotion] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) {
    throw new Error("No response from create_promotion");
  }

  return {
    id: rows[0].out_id as string,
    name: rows[0].out_name as string,
    status: rows[0].out_status as string,
  };
}

export type UpdatePromotionParams = {
  promotionId: string;
  orgId: string;
  name?: string | null;
  description?: string | null;
  voucherCode?: string | null;
  discountValue?: number | null;
  minimumOrderAmount?: number | null;
  totalUsesCap?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  targetProductIds?: string[] | null;
  giftVariationId?: string | null;
  giftQuantity?: number | null;
  eligibilityRules?: Array<{
    rule_type: string;
    metadata?: Record<string, unknown>;
  }> | null;
};

export async function updatePromotion(
  params: UpdatePromotionParams,
): Promise<CreatePromotionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_promotion", {
    p_promotion_id: params.promotionId,
    p_org_id: params.orgId,
    p_name: params.name ?? null,
    p_description: params.description ?? null,
    p_voucher_code: params.voucherCode ?? null,
    p_discount_value: params.discountValue ?? null,
    p_minimum_order_amount: params.minimumOrderAmount ?? null,
    p_total_uses_cap: params.totalUsesCap ?? null,
    p_starts_at: params.startsAt ?? null,
    p_ends_at: params.endsAt ?? null,
    p_target_product_ids: params.targetProductIds ?? null,
    p_gift_variation_id: params.giftVariationId ?? null,
    p_gift_quantity: params.giftQuantity ?? null,
    p_eligibility_rules: params.eligibilityRules
      ? JSON.stringify(params.eligibilityRules)
      : null,
  });

  if (error) {
    console.error("[updatePromotion] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) {
    throw new Error("No response from update_promotion");
  }

  return {
    id: rows[0].out_id as string,
    name: rows[0].out_name as string,
    status: rows[0].out_status as string,
  };
}

export type UpdatePromotionStatusResult = {
  id: string;
  name: string;
  old_status: string;
  new_status: string;
};

export async function updatePromotionStatus(
  promotionId: string,
  orgId: string,
  newStatus: "active" | "paused",
): Promise<UpdatePromotionStatusResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_promotion_status", {
    p_promotion_id: promotionId,
    p_org_id: orgId,
    p_new_status: newStatus,
  });

  if (error) {
    console.error("[updatePromotionStatus] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) {
    throw new Error("No response from update_promotion_status");
  }

  return {
    id: rows[0].out_id as string,
    name: rows[0].out_name as string,
    old_status: rows[0].out_old_status as string,
    new_status: rows[0].out_new_status as string,
  };
}

export async function duplicatePromotion(
  promotionId: string,
  orgId: string,
  newName?: string | null,
): Promise<CreatePromotionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("duplicate_promotion", {
    p_promotion_id: promotionId,
    p_org_id: orgId,
    p_new_name: newName ?? null,
  });

  if (error) {
    console.error("[duplicatePromotion] RPC error:", error.message);
    throw new Error(error.message);
  }

  const rows = (data as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) {
    throw new Error("No response from duplicate_promotion");
  }

  return {
    id: rows[0].out_id as string,
    name: rows[0].out_name as string,
    status: rows[0].out_status as string,
  };
}
