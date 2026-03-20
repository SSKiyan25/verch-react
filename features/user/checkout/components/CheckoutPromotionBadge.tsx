"use client";

import { X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CheckoutPromotionBadgeProps {
  name: string;
  discountType: "percentage" | "fixed" | "free_item";
  discountValue: number | null;
  isEligible?: boolean;
  ineligibleReason?: string;
  onRemove?: () => void;
}

function formatDiscount(
  type: "percentage" | "fixed" | "free_item",
  value: number | null,
): string {
  if (value === null) return "";
  if (type === "percentage") return `-${value}%`;
  if (type === "fixed")
    return `-₱${new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2 }).format(value)}`;
  return "Free item";
}

export function CheckoutPromotionBadge({
  name,
  discountType,
  discountValue,
  isEligible = true,
  ineligibleReason,
  onRemove,
}: CheckoutPromotionBadgeProps) {
  const discountText = formatDiscount(discountType, discountValue);

  // Voucher badge (has remove button)
  if (onRemove) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
        <span>
          {name}
          {discountText ? ` · ${discountText}` : ""}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove voucher"
          className="ml-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 p-0.5 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  }

  // Auto promo — ineligible (grayed out with tooltip)
  if (!isEligible) {
    const badge = (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border line-through cursor-help">
        Auto: {name}
        {discountText ? ` · ${discountText}` : ""}
      </span>
    );
    if (ineligibleReason) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {ineligibleReason}
          </TooltipContent>
        </Tooltip>
      );
    }
    return badge;
  }

  // Auto promo — eligible (green)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
        "bg-green-100 text-green-800 border border-green-200",
        "dark:bg-green-900/30 dark:text-green-300",
      )}
    >
      Auto: {name}
      {discountText ? ` · ${discountText}` : ""}
    </span>
  );
}
