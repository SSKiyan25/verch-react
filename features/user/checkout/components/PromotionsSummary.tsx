"use client";

import { Tag, Percent } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type AppliedPromotion = {
  name: string;
  discountType: "percentage" | "fixed" | "free_item";
  discountValue: number;
  discountAmount: number;
  isVoucher?: boolean;
};

type PromotionsSummaryProps = {
  promotions: AppliedPromotion[];
  className?: string;
};

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("PHP", "₱");
}

/**
 * Display summary of applied promotions in checkout order summary.
 * Shows promotion name, type, and discount amount.
 *
 * Used in CheckoutOrderSummary to show all active discounts.
 */
export function PromotionsSummary({
  promotions,
  className,
}: PromotionsSummaryProps) {
  if (promotions.length === 0) return null;

  const totalDiscount = promotions.reduce(
    (sum, p) => sum + p.discountAmount,
    0,
  );

  return (
    <div className={cn("space-y-2", className)}>
      <Separator />

      {/* Section header */}
      <div className="flex items-center gap-2">
        <Tag className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2} />
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          Applied Promotions
        </p>
      </div>

      {/* Promotions list */}
      <div className="space-y-1.5">
        {promotions.map((promo, index) => (
          <div
            key={`${promo.name}-${index}`}
            className="flex items-start justify-between gap-2 text-xs"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {promo.isVoucher && (
                  <span className="text-blue-600 dark:text-blue-400">
                    [Voucher]{" "}
                  </span>
                )}
                {promo.name}
              </p>
              <p className="text-muted-foreground text-[10px]">
                {promo.discountType === "percentage" && (
                  <span className="flex items-center gap-1">
                    <Percent className="h-2.5 w-2.5" />
                    {promo.discountValue}% discount
                  </span>
                )}
                {promo.discountType === "fixed" && (
                  <span>₱{promo.discountValue} off</span>
                )}
                {promo.discountType === "free_item" && <span>Free item</span>}
              </p>
            </div>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
              −{formatCurrency(promo.discountAmount)}
            </span>
          </div>
        ))}
      </div>

      {/* Total discount */}
      {promotions.length > 1 && (
        <>
          <Separator className="my-2" />
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-emerald-700 dark:text-emerald-400">
              Total Savings
            </span>
            <span className="text-emerald-700 dark:text-emerald-400">
              −{formatCurrency(totalDiscount)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
