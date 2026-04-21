"use client";

import { Badge } from "@/components/ui/badge";
import {
  calculatePromotionPrice,
  type ProductActivePromotion,
} from "@/lib/types/public-promotions";

type CartItemPriceProps = {
  currentPrice: number;
  quantity: number;
  priceChanged?: boolean;
  snapshotPrice?: number;
  promotion?: ProductActivePromotion | null;
  showSubtotal?: boolean;
};

/**
 * Format price for display
 */
function formatPrice(amount: number): string {
  return amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
  });
}

/**
 * Display cart item price with optional promotion discount.
 *
 * Clean, minimal design that avoids clutter:
 * - Unit price: Shows final price with optional small discount badge
 * - Subtotal: Shows final amount cleanly (no duplicate strikethrough)
 *
 * Designed specifically for cart layout (compact, inline display).
 */
export function CartItemPrice({
  currentPrice,
  quantity,
  priceChanged = false,
  snapshotPrice,
  promotion,
  showSubtotal = false,
}: CartItemPriceProps) {
  // Calculate final price if promotion is eligible
  const hasEligiblePromotion = promotion?.isEligible === true;
  const promotionResult = hasEligiblePromotion
    ? calculatePromotionPrice(currentPrice, promotion)
    : null;

  const finalUnitPrice = promotionResult?.finalPrice ?? currentPrice;
  const finalSubtotal = finalUnitPrice * quantity;
  const hasPromotionDiscount = promotionResult && finalUnitPrice < currentPrice;

  // For unit price display (not subtotal)
  if (!showSubtotal) {
    return (
      <div className="flex items-baseline gap-1.5 flex-wrap">
        {/* Final unit price */}
        <span
          className={`text-sm font-semibold ${hasPromotionDiscount ? "text-emerald-600" : ""}`}
        >
          ₱{formatPrice(finalUnitPrice)}
        </span>

        {/* Small discount percentage badge - clean and minimal */}
        {hasPromotionDiscount && promotionResult && (
          <Badge
            variant="secondary"
            className="h-4 px-1.5 text-[10px] bg-emerald-100 text-emerald-700 border-0"
          >
            -{promotionResult.discountPercentage.toFixed(0)}%
          </Badge>
        )}

        {/* Price changed warning (if applicable and no promotion) */}
        {priceChanged && snapshotPrice && !hasPromotionDiscount && (
          <span className="text-xs text-muted-foreground line-through">
            ₱{formatPrice(snapshotPrice)}
          </span>
        )}
      </div>
    );
  }

  // For subtotal display (desktop) - clean, no clutter
  return (
    <div className="text-right">
      <p
        className={`text-sm font-semibold ${hasPromotionDiscount ? "text-emerald-600" : ""}`}
      >
        ₱{formatPrice(finalSubtotal)}
      </p>
      {/* Optional: Show savings amount subtly if discounted */}
      {hasPromotionDiscount && promotionResult && (
        <p className="text-[10px] text-emerald-600 mt-0.5">
          Save ₱{formatPrice((currentPrice - finalUnitPrice) * quantity)}
        </p>
      )}
    </div>
  );
}
