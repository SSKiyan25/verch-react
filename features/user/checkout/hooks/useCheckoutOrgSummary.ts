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

function computeDiscount(
  subtotal: number,
  promo: {
    discount_type: string;
    discount_value: number;
    is_eligible?: boolean;
    is_valid?: boolean;
  } | null,
): number {
  if (!promo) return 0;
  // auto promo guard
  if ("is_eligible" in promo && promo.is_eligible === false) return 0;
  // voucher guard
  if ("is_valid" in promo && promo.is_valid === false) return 0;
  if (promo.discount_type === "percentage") {
    return Math.round(subtotal * (promo.discount_value / 100) * 100) / 100;
  }
  if (promo.discount_type === "fixed") {
    return Math.min(promo.discount_value, subtotal);
  }
  return 0; // free_item: no monetary discount shown
}

// ─── Pure function (safe inside useMemo / map) ──────────────────────────────

export function computeOrgSummary({
  items,
  bundleInstances,
  applicablePromotions,
  appliedVoucher,
}: UseCheckoutOrgSummaryProps): UseCheckoutOrgSummaryReturn {
  const itemsTotal = items
    .filter((i) => i.bundleInstanceId === null)
    .reduce((sum, i) => sum + i.unitPriceSnapshot * i.quantity, 0);
  const bundlesTotal = bundleInstances.reduce(
    (sum, b) => sum + b.bundlePrice * b.quantity,
    0,
  );
  const subtotal = itemsTotal + bundlesTotal;

  const eligibleAutoPromos = applicablePromotions.filter(
    (p) => p.trigger_type === "auto" && p.is_eligible,
  );
  const bestEligibleAutoPromo =
    eligibleAutoPromos.length > 0
      ? eligibleAutoPromos.reduce((best, p) => {
          const bestAmt = computeDiscount(subtotal, best);
          const pAmt = computeDiscount(subtotal, p);
          return pAmt > bestAmt ? p : best;
        })
      : null;

  const autoDiscount = computeDiscount(subtotal, bestEligibleAutoPromo);
  const voucherDiscount = computeDiscount(subtotal, appliedVoucher);
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
}: UseCheckoutOrgSummaryProps): UseCheckoutOrgSummaryReturn {
  return useMemo(
    () =>
      computeOrgSummary({
        items,
        bundleInstances,
        applicablePromotions,
        appliedVoucher,
      }),
    [items, bundleInstances, applicablePromotions, appliedVoucher],
  );
}
