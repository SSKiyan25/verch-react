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

/**
 * Compute discount for order-level promotions (organization/order target types).
 * Applies to the entire subtotal.
 */
function computeOrderLevelDiscount(
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

/**
 * Compute discount for product-level promotions.
 * Applies only to matching products in the cart.
 */
function computeProductLevelDiscount(
  items: CheckoutCartItem[],
  promo: ApplicablePromotion | null,
): number {
  if (!promo || !promo.is_eligible) return 0;
  if (promo.discount_type === "free_item") return 0; // no monetary discount

  // Sum discounts for all standalone items (bundles don't get product-level promotions)
  let totalDiscount = 0;
  for (const item of items) {
    if (item.bundleInstanceId !== null) continue; // skip bundle components

    const itemSubtotal = item.unitPriceSnapshot * item.quantity;
    if (promo.discount_type === "percentage") {
      totalDiscount += Math.round(itemSubtotal * (promo.discount_value / 100) * 100) / 100;
    } else if (promo.discount_type === "fixed") {
      // For fixed discount, apply per unit (capped at unit price), then multiply by quantity
      const discountPerUnit = Math.min(promo.discount_value, item.unitPriceSnapshot);
      totalDiscount += discountPerUnit * item.quantity;
    }
  }
  return totalDiscount;
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

  // Separate product-level and order-level promotions
  const eligibleAutoPromos = applicablePromotions.filter(
    (p) => p.trigger_type === "auto" && p.is_eligible,
  );
  
  const productLevelPromos = eligibleAutoPromos.filter(
    (p) => p.target_type === "product"
  );
  const orderLevelPromos = eligibleAutoPromos.filter(
    (p) => p.target_type === "organization" || p.target_type === "order"
  );

  // Find best product-level promo (if any)
  const bestProductPromo = productLevelPromos.length > 0
    ? productLevelPromos.reduce((best, p) => {
        const bestAmt = computeProductLevelDiscount(items, best);
        const pAmt = computeProductLevelDiscount(items, p);
        return pAmt > bestAmt ? p : best;
      })
    : null;

  // Find best order-level promo (if any)
  const bestOrderPromo = orderLevelPromos.length > 0
    ? orderLevelPromos.reduce((best, p) => {
        const bestAmt = computeOrderLevelDiscount(subtotal, best);
        const pAmt = computeOrderLevelDiscount(subtotal, p);
        return pAmt > bestAmt ? p : best;
      })
    : null;

  // Calculate discounts
  const productDiscount = computeProductLevelDiscount(items, bestProductPromo);
  const orderDiscount = computeOrderLevelDiscount(subtotal, bestOrderPromo);
  
  // Choose the  better promo (product-level OR order-level, not both)
  const bestEligibleAutoPromo = productDiscount > orderDiscount ? bestProductPromo : bestOrderPromo;
  const autoDiscount = Math.max(productDiscount, orderDiscount);

  // Voucher discount (always order-level)
  const voucherDiscount = computeOrderLevelDiscount(subtotal, appliedVoucher);
  
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
