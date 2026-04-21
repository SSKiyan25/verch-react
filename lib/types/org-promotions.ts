// =============================================================================
// lib/types/org-promotions.ts
// Types for org promotions management domain
// These are shared across: queries, Server Actions, hooks, and components.
// =============================================================================

// ---------------------------------------------------------------------------
// Enums (mirrors DB enums — typed as string literals)
// Source: verch-enum-reference.md
// ---------------------------------------------------------------------------

export type PromotionStatus =
  | "draft"
  | "active"
  | "paused"
  | "expired"
  | "exhausted";

export type PromotionTriggerType = "voucher_code" | "auto";

export type PromotionDiscountType = "percentage" | "fixed" | "free_item";

export type PromotionTargetType = "product" | "organization" | "order";

export type EligibilityRuleType = "verified_student" | "active_member";

// ---------------------------------------------------------------------------
// OrgPromotionListItem
// Shape returned by get_org_promotions (one row per promotion in the list).
// ---------------------------------------------------------------------------

export type OrgPromotionListItem = {
  id: string;
  name: string;
  description: string | null;
  status: PromotionStatus;
  trigger_type: PromotionTriggerType;
  voucher_code: string | null;
  target_type: PromotionTargetType;
  discount_type: PromotionDiscountType;
  discount_value: number | null;
  minimum_order_amount: number;
  total_uses_cap: number | null;
  total_uses_count: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// OrgPromotionsResult
// Returned by the getCachedOrgPromotions cached wrapper.
// ---------------------------------------------------------------------------

export type OrgPromotionsResult = {
  items: OrgPromotionListItem[];
  totalCount: number;
};

// ---------------------------------------------------------------------------
// Nested JSONB types for promotion detail
// ---------------------------------------------------------------------------

export type PromotionTarget = {
  id: string;
  product_id: string | null;
  product_name: string | null;
  organization_id: string | null;
  organization_name: string | null;
};

export type PromotionGiftItem = {
  id: string;
  variation_id: string;
  variation_name: string | null;
  product_name: string | null;
  quantity: number;
} | null;

export type PromotionEligibilityRule = {
  id: string;
  rule_type: EligibilityRuleType;
  metadata: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// OrgPromotionDetail
// Shape returned by get_org_promotion_detail (full view).
// ---------------------------------------------------------------------------

export type OrgPromotionDetail = {
  id: string;
  name: string;
  description: string | null;
  status: PromotionStatus;
  trigger_type: PromotionTriggerType;
  voucher_code: string | null;
  target_type: PromotionTargetType;
  discount_type: PromotionDiscountType;
  discount_value: number | null;
  minimum_order_amount: number;
  total_uses_cap: number | null;
  total_uses_count: number;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  targets: PromotionTarget[];
  gift_item: PromotionGiftItem;
  eligibility_rules: PromotionEligibilityRule[];
};

// ---------------------------------------------------------------------------
// Filters for promotions list
// ---------------------------------------------------------------------------

export type OrgPromotionFilters = {
  status?: PromotionStatus | null;
  triggerType?: PromotionTriggerType | null;
  search?: string | null;
};

// ---------------------------------------------------------------------------
// Action Response types
// ---------------------------------------------------------------------------

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type PromotionActionResult = ActionResult<{
  id: string;
  name: string;
  status: string;
}>;

export type PromotionStatusChangeResult = ActionResult<{
  id: string;
  name: string;
  old_status: string;
  new_status: string;
}>;
