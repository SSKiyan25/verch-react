"use client";

import { Percent, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProductActivePromotion } from "@/lib/types/public-promotions";

type PromotionBadgeProps = {
  promotion: ProductActivePromotion;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "compact";
};

/**
 * Format discount value for display
 */
function formatDiscount(
  type: "percentage" | "fixed" | "free_item",
  value: number,
): string {
  if (type === "percentage") return `${value}% OFF`;
  if (type === "fixed")
    return `-₱${new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0 }).format(value)}`;
  return "FREE ITEM";
}

/**
 * Display promotion badge on product cards and detail pages.
 * Shows discount value with clean, vibrant design.
 *
 * Features:
 * - Multiple sizes (sm, md, lg) for different contexts
 * - Compact variant for tight spaces
 * - Tooltip for ineligible promotions
 * - Accessible keyboard navigation
 */
export function PromotionBadge({
  promotion,
  size = "md",
  variant = "default",
}: PromotionBadgeProps) {
  const discountText = formatDiscount(
    promotion.discountType,
    promotion.discountValue,
  );

  // Size classes
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px] gap-0.5",
    md: "px-2 py-1 text-xs gap-1",
    lg: "px-3 py-1.5 text-sm gap-1.5",
  };

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-3.5 w-3.5",
  };

  // Ineligible state (grayed out with tooltip)
  if (!promotion.isEligible) {
    const badge = (
      <span
        className={cn(
          "inline-flex items-center font-semibold rounded-md",
          "bg-muted text-muted-foreground border border-border",
          "opacity-60 cursor-help",
          "transition-opacity duration-200 hover:opacity-80",
          sizeClasses[size],
        )}
        role="status"
        aria-label={`Promotion not eligible: ${promotion.ineligibleReason ?? "Requirements not met"}`}
      >
        <Tag className={iconSizes[size]} strokeWidth={2.5} />
        {variant === "default" && <span>{discountText}</span>}
      </span>
    );

    if (promotion.ineligibleReason) {
      return (
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>{badge}</TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs text-xs bg-popover/95 backdrop-blur-sm"
            >
              <p className="font-medium">{promotion.name}</p>
              <p className="text-muted-foreground mt-0.5">
                {promotion.ineligibleReason}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badge;
  }

  // Eligible state (vibrant success green with urgency orange accent)
  const badge = (
    <span
      className={cn(
        "inline-flex items-center font-bold rounded-md shadow-sm",
        "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white",
        "border border-emerald-600/20",
        "transition-all duration-200 hover:shadow-md hover:scale-105",
        sizeClasses[size],
      )}
      role="status"
      aria-label={`Active promotion: ${discountText}`}
    >
      <Percent className={iconSizes[size]} strokeWidth={2.5} />
      {variant === "default" && <span>{discountText}</span>}
    </span>
  );

  // Show tooltip with name and description if available
  if (promotion.name || promotion.description) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-xs text-xs bg-popover/95 backdrop-blur-sm"
          >
            <p className="font-medium">{promotion.name}</p>
            {promotion.description && (
              <p className="text-muted-foreground mt-0.5">
                {promotion.description}
              </p>
            )}
            {promotion.minimumOrderAmount && (
              <p className="text-muted-foreground mt-1 text-[10px]">
                Min. order: ₱
                {new Intl.NumberFormat("en-PH", {
                  minimumFractionDigits: 0,
                }).format(promotion.minimumOrderAmount)}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
