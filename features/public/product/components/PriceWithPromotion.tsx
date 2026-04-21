"use client";

import { cn } from "@/lib/utils";
import {
  calculatePromotionPrice,
  type ProductActivePromotion,
} from "@/lib/types/public-promotions";

type PriceWithPromotionProps = {
  price: number;
  compareAtPrice?: number | null;
  promotion?: ProductActivePromotion | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Format price for display
 */
function formatPrice(amount: number, compact = false): string {
  const formatted = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: compact ? 0 : 2,
  }).format(amount);
  return formatted.replace("PHP", "₱");
}

/**
 * Display product price with optional compare-at price and promotion discount.
 * Handles three scenarios:
 * 1. Regular price only
 * 2. Compare-at price (original sale pricing from product)
 * 3. Promotion applied (shows promotional discount)
 *
 * Promotion takes precedence over compare-at price for discount display.
 *
 * Visual hierarchy:
 * - Strikethrough original price (muted)
 * - Prominent final price (primary color, bold)
 * - Optional savings badge
 */
export function PriceWithPromotion({
  price,
  compareAtPrice,
  promotion,
  size = "md",
  className,
}: PriceWithPromotionProps) {
  // Calculate final price if promotion is eligible
  const hasEligiblePromotion = promotion?.isEligible === true;
  const promotionResult = hasEligiblePromotion
    ? calculatePromotionPrice(price, promotion)
    : null;

  // Determine display prices
  const originalPrice = promotionResult ? price : (compareAtPrice ?? null);
  const finalPrice = promotionResult?.finalPrice ?? price;
  const hasDiscount = originalPrice !== null && originalPrice > finalPrice;

  // Size classes
  const originalClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const finalClasses = {
    sm: "text-base font-bold",
    md: "text-xl font-bold",
    lg: "text-2xl font-bold",
  };

  const savingsClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  return (
    <div className={cn("flex items-baseline gap-2 flex-wrap", className)}>
      {/* Original price (strikethrough) */}
      {hasDiscount && originalPrice && (
        <span
          className={cn(
            "text-muted-foreground line-through",
            originalClasses[size],
          )}
        >
          {formatPrice(originalPrice)}
        </span>
      )}

      {/* Final price */}
      <span className={cn("text-primary", finalClasses[size])}>
        {formatPrice(finalPrice)}
      </span>

      {/* Savings badge (only for promotions) */}
      {hasEligiblePromotion && promotionResult && (
        <span
          className={cn(
            "inline-flex items-center font-semibold rounded-full",
            "bg-orange-100 text-orange-700 border border-orange-200",
            "dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
            savingsClasses[size],
          )}
        >
          Save {Math.round(promotionResult.discountPercentage)}%
        </span>
      )}
    </div>
  );
}
