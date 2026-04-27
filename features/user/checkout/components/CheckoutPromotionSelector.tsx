"use client";

import { Tag, Percent, Zap, Circle, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ApplicablePromotion } from "@/lib/supabase/queries/orders";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckoutPromotionSelectorProps {
  orgId: string;
  promotions: ApplicablePromotion[];
  selectedPromotionId: string | null;
  onSelect: (promotionId: string | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDiscountLabel(
  type: "percentage" | "fixed" | "free_item",
  value: number | null,
): string {
  if (value === null) return "";
  if (type === "percentage") return `${value}% OFF`;
  if (type === "fixed")
    return `₱${new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2 }).format(value)} OFF`;
  return "FREE ITEM";
}

function formatSavings(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("PHP", "₱");
}

function getDiscountTypeIcon(type: "percentage" | "fixed" | "free_item") {
  switch (type) {
    case "percentage":
      return <Percent className="h-3 w-3" />;
    case "fixed":
      return <Tag className="h-3 w-3" />;
    case "free_item":
      return <Zap className="h-3 w-3" />;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckoutPromotionSelector({
  promotions,
  selectedPromotionId,
  onSelect,
}: CheckoutPromotionSelectorProps) {
  const eligibleAutoPromos = promotions.filter(
    (p) => p.trigger_type === "auto" && p.is_eligible,
  );
  const ineligibleAutoPromos = promotions.filter(
    (p) => p.trigger_type === "auto" && !p.is_eligible,
  );

  if (eligibleAutoPromos.length === 0 && ineligibleAutoPromos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Promotions</p>
      </div>

      {/* "No promotion" option */}
      <label
        className={cn(
          "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-all duration-200",
          selectedPromotionId === null
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border hover:border-muted-foreground/30 hover:shadow-sm",
        )}
      >
        <div className="shrink-0">
          {selectedPromotionId === null ? (
            <CircleCheck className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">No promotion</p>
          <p className="text-xs text-muted-foreground">
            Skip promotions for this order
          </p>
        </div>
        <input
          type="radio"
          name="promotion-select"
          className="sr-only"
          checked={selectedPromotionId === null}
          onChange={() => onSelect(null)}
        />
      </label>

      {/* Eligible promotions */}
      {eligibleAutoPromos.map((promo) => {
        const isSelected = selectedPromotionId === promo.promotion_id;
        return (
          <label
            key={promo.promotion_id}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-all duration-200",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-muted-foreground/30 hover:shadow-sm",
            )}
          >
            <div className="shrink-0">
              {isSelected ? (
                <CircleCheck className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{promo.name}</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                    promo.discount_type === "percentage"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : promo.discount_type === "fixed"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                  )}
                >
                  {getDiscountTypeIcon(promo.discount_type)}
                  {formatDiscountLabel(
                    promo.discount_type,
                    promo.discount_value,
                  )}
                </span>
              </div>
              {promo.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {promo.description}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                &minus;{formatSavings(promo.calculated_discount)}
              </p>
            </div>
            <input
              type="radio"
              name="promotion-select"
              className="sr-only"
              checked={isSelected}
              onChange={() => onSelect(promo.promotion_id)}
            />
          </label>
        );
      })}

      {/* Ineligible promotions (grayed out) */}
      {ineligibleAutoPromos.map((promo) => (
        <Tooltip key={promo.promotion_id}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 opacity-50 cursor-not-allowed",
                "border-border bg-muted/30",
              )}
            >
              <div className="shrink-0">
                <Circle className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate line-through">
                    {promo.name}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0 line-through">
                    {getDiscountTypeIcon(promo.discount_type)}
                    {formatDiscountLabel(
                      promo.discount_type,
                      promo.discount_value,
                    )}
                  </span>
                </div>
                {promo.description && (
                  <p className="text-xs text-muted-foreground/50 mt-0.5 line-clamp-2 line-through">
                    {promo.description}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-muted-foreground/50">
                  &minus;{formatSavings(promo.calculated_discount)}
                </p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {promo.ineligible_reason ?? "Not eligible for this order"}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
