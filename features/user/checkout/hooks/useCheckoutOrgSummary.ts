"use client";

import { useMemo } from "react";
import type {
  ApplicablePromotion,
  VoucherValidationResult,
} from "@/lib/supabase/queries/orders";
import type {
  CheckoutCartItem,
  CheckoutBundleInstance,
} from "@/features/user/checkout/types/checkoutTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CheckoutGroupedItem =
  | { type: "standalone"; item: CheckoutCartItem }
  | { type: "bundle"; instance: CheckoutBundleInstance };

interface UseCheckoutOrgSummaryProps {
  items: CheckoutCartItem[];
  bundleInstances: CheckoutBundleInstance[];
  applicablePromotions: ApplicablePromotion[];
  appliedVoucher: VoucherValidationResult | null;
  selectedPromotionId?: string | null;
}

interface UseCheckoutOrgSummaryReturn {
  subtotal: number;
  bestEligibleAutoPromo: ApplicablePromotion | null;
  autoDiscount: number;
  voucherDiscount: number;
  totalDiscount: number;
  orgTotal: number;
  groupedItems: CheckoutGroupedItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the best eligible auto-apply promotion based on calculated_discount.
 * The RPC now calculates the exact discount amount, so we just compare them.
 */
function getBestAutoPromotion(
  promotions: ApplicablePromotion[],
): ApplicablePromotion | null {
  const eligible = promotions.filter(
    (p) => p.trigger_type === "auto" && p.is_eligible,
  );
  if (eligible.length === 0) return null;

  // Return the promo with the highest calculated_discount
  return eligible.reduce((best, p) =>
    p.calculated_discount > best.calculated_discount ? p : best,
  );
}

/**
 * Compute discount from voucher validation result (order-level only).
 * For vouchers, the backend validate_voucher_code RPC handles the calculation.
 */
function computeVoucherDiscount(
  subtotal: number,
  voucher: {
    discount_type: string;
    discount_value: number;
    is_valid?: boolean;
  } | null,
): number {
  if (!voucher || !voucher.is_valid) return 0;
  if (voucher.discount_type === "percentage") {
    return Math.round(subtotal * (voucher.discount_value / 100) * 100) / 100;
  }
  if (voucher.discount_type === "fixed") {
    return Math.min(voucher.discount_value, subtotal);
  }
  return 0; // free_item: no monetary discount shown
}

// ─── Pure function (safe inside useMemo / map) ──────────────────────────────

export function computeOrgSummary({
  items,
  bundleInstances,
  applicablePromotions,
  appliedVoucher,
  selectedPromotionId,
}: UseCheckoutOrgSummaryProps): UseCheckoutOrgSummaryReturn {
  const itemsTotal = items
    .filter((i) => i.bundleInstanceId === null)
    .reduce((sum, i) => sum + i.unitPriceSnapshot * i.quantity, 0);
  const bundlesTotal = bundleInstances.reduce(
    (sum, b) => sum + b.bundlePrice * b.quantity,
    0,
  );
  const subtotal = itemsTotal + bundlesTotal;

  // Determine which auto promotion to use:
  // - If selectedPromotionId is explicitly provided (even null), use that
  // - If selectedPromotionId is undefined (not provided), fall back to auto-best
  let bestEligibleAutoPromo: ApplicablePromotion | null;
  if (selectedPromotionId === undefined) {
    // Backward compatible: auto-select best
    bestEligibleAutoPromo = getBestAutoPromotion(applicablePromotions);
  } else if (selectedPromotionId === null) {
    // User explicitly chose "no promotion"
    bestEligibleAutoPromo = null;
  } else {
    // User selected a specific promotion
    bestEligibleAutoPromo =
      applicablePromotions.find(
        (p) => p.promotion_id === selectedPromotionId && p.is_eligible,
      ) ?? null;
  }
  const autoDiscount = bestEligibleAutoPromo?.calculated_discount ?? 0;

  // Voucher discount (computed from voucher validation result)
  const voucherDiscount = computeVoucherDiscount(subtotal, appliedVoucher);

  const totalDiscount = autoDiscount + voucherDiscount;
  const orgTotal = Math.max(0, subtotal - totalDiscount);

  const standalones: CheckoutCartItem[] = items.filter(
    (i) => i.bundleInstanceId === null,
  );
  const groupedItems: CheckoutGroupedItem[] = [
    ...bundleInstances.map(
      (b): CheckoutGroupedItem => ({ type: "bundle", instance: b }),
    ),
    ...standalones.map(
      (i): CheckoutGroupedItem => ({ type: "standalone", item: i }),
    ),
  ];

  return {
    subtotal,
    bestEligibleAutoPromo,
    autoDiscount,
    voucherDiscount,
    totalDiscount,
    orgTotal,
    groupedItems,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCheckoutOrgSummary({
  items,
  bundleInstances,
  applicablePromotions,
  appliedVoucher,
  selectedPromotionId,
}: UseCheckoutOrgSummaryProps): UseCheckoutOrgSummaryReturn {
  return useMemo(
    () =>
      computeOrgSummary({
        items,
        bundleInstances,
        applicablePromotions,
        appliedVoucher,
        selectedPromotionId,
      }),
    [
      items,
      bundleInstances,
      applicablePromotions,
      appliedVoucher,
      selectedPromotionId,
    ],
  );
}
