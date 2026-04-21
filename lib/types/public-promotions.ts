// lib/types/public-promotions.ts

/**
 * Active promotion displayed on product pages (badge display)
 */
export type ProductActivePromotion = {
  id: string;
  name: string;
  description: string | null;
  discountType: "percentage" | "fixed" | "free_item";
  discountValue: number;
  minimumOrderAmount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  isEligible: boolean;
  ineligibleReason: string | null;
};

/**
 * Batch promotion response (includes product ID for mapping)
 * Used when fetching promotions for multiple products
 */
export type ProductActivePromotionBatch = ProductActivePromotion & {
  productId: string;
};

/**
 * Map of product IDs to their active promotions
 * Convenience type for organizing batch promotion results
 */
export type ProductPromotionsMap = Map<string, ProductActivePromotion[]>;

/**
 * Promotion state at checkout (applied to cart items)
 */
export type CheckoutPromotionState = {
  promotionId: string;
  name: string;
  discountType: "percentage" | "fixed" | "free_item";
  discountValue: number;
  discountAmount: number; // Calculated discount in currency
  voucherCode?: string; // Present if triggered by voucher
};

/**
 * Cart item with promotion info for checkout display
 */
export type CartItemWithPromotion = {
  cartItemId: string;
  productId: string;
  variationId: string;
  productName: string;
  variationName: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  appliedPromotions: CheckoutPromotionState[];
  finalPrice: number; // After all promotions applied
};

/**
 * Voucher validation result from server action
 */
export type VoucherValidationResult =
  | {
      success: true;
      promotion: {
        id: string;
        name: string;
        description: string | null;
        discountType: "percentage" | "fixed" | "free_item";
        discountValue: number;
        minimumOrderAmount: number | null;
        maxDiscountAmount: number | null;
        targetType: "product" | "organization" | "order";
        voucherCode: string;
      };
    }
  | {
      success: false;
      error: string;
    };

/**
 * Price calculation helper result
 */
export type PromotionPriceResult = {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  discountPercentage: number; // For display (X% OFF)
};

// ─── Helper Functions ─────────────────────────────────────────────────────────
// Pure functions placed here so client components can import them safely

/**
 * Calculate the final price after applying a promotion discount.
 * This is a pure function, safe to use in client components.
 *
 * @param originalPrice - The original price before discount
 * @param promotion - The promotion to apply
 * @returns Price breakdown with discount amount and final price
 */
export function calculatePromotionPrice(
  originalPrice: number,
  promotion: Pick<ProductActivePromotion, "discountType" | "discountValue">,
): PromotionPriceResult {
  let discountAmount = 0;

  switch (promotion.discountType) {
    case "percentage":
      discountAmount = (originalPrice * promotion.discountValue) / 100;
      break;
    case "fixed":
      discountAmount = Math.min(promotion.discountValue, originalPrice);
      break;
    case "free_item":
      discountAmount = originalPrice; // 100% off
      break;
  }

  const finalPrice = Math.max(0, originalPrice - discountAmount);
  const discountPercentage =
    originalPrice > 0 ? (discountAmount / originalPrice) * 100 : 0;

  return {
    originalPrice,
    discountAmount,
    finalPrice,
    discountPercentage,
  };
}
