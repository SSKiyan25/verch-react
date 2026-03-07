"use client";

import { cn } from "@/lib/utils";
import type { PublicProductVariationDetail } from "@/lib/supabase/queries/products";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

type StockInfo = {
  label: string;
  className: string;
};

function getStockInfo(v: PublicProductVariationDetail): StockInfo {
  if (!v.is_available)
    return { label: "Unavailable", className: "text-muted-foreground" };
  if (v.available_quantity === 0) {
    if (v.pre_order_quantity > 0)
      return { label: "Pre-order", className: "text-amber-600" };
    return { label: "Out of stock", className: "text-destructive" };
  }
  if (v.available_quantity <= 10)
    return {
      label: `${v.available_quantity} left`,
      className: "text-amber-600",
    };
  return { label: "In stock", className: "text-emerald-600" };
}

type ProductVariantSelectorProps = {
  variations: PublicProductVariationDetail[];
  selectedVariation: PublicProductVariationDetail | null;
  selectVariation: (variation: PublicProductVariationDetail) => void;
};

export function ProductVariantSelector({
  variations,
  selectedVariation,
  selectVariation,
}: ProductVariantSelectorProps) {
  if (variations.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground/80">
          Variants
          <span className="ml-1.5 font-normal text-muted-foreground">
            ({variations.length})
          </span>
        </p>
        <p className="text-[11px] text-muted-foreground">Tap to pre-select</p>
      </div>

      {/* Compact list */}
      <div className="rounded-lg border overflow-hidden divide-y divide-border">
        {variations.map((variation) => {
          const isSelected = selectedVariation?.id === variation.id;
          const unavailable = !variation.is_available;
          const stockInfo = getStockInfo(variation);

          const customAttributes = Object.entries(variation.attributes).filter(
            ([k]) => k !== "Variant",
          );

          return (
            <button
              key={variation.id}
              type="button"
              onClick={() => !unavailable && selectVariation(variation)}
              disabled={unavailable}
              aria-pressed={isSelected}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "bg-primary/8 border-l-[3px] border-l-primary"
                  : unavailable
                    ? "cursor-not-allowed bg-muted/20 opacity-50"
                    : "bg-card hover:bg-muted/40",
              )}
            >
              {/* Radio dot */}
              <span
                className={cn(
                  "shrink-0 h-3.5 w-3.5 rounded-full border-2 transition-colors",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40 bg-transparent",
                )}
              />

              {/* Name + attribute chips — takes remaining space */}
              <span className="flex-1 min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span
                  className={cn(
                    "text-sm font-medium leading-tight",
                    isSelected ? "text-primary" : "text-foreground",
                  )}
                >
                  {variation.variation_name ?? "Variant"}
                </span>
                {customAttributes.map(([key, val]) => (
                  <span
                    key={key}
                    className="inline-flex items-center rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground whitespace-nowrap"
                  >
                    <span className="font-medium text-foreground/60">
                      {key}:
                    </span>
                    &nbsp;{val}
                  </span>
                ))}
              </span>

              {/* Price + stock — pinned right */}
              <span className="shrink-0 flex flex-col items-end gap-px">
                <span
                  className={cn(
                    "text-xs font-bold tabular-nums leading-tight",
                    isSelected ? "text-primary" : "text-foreground",
                  )}
                >
                  {formatPrice(variation.price)}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-tight",
                    stockInfo.className,
                  )}
                >
                  {stockInfo.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Hint */}
      <p className="text-[11px] text-muted-foreground/70">
        Quantity and final variant selection are set in the next step.
      </p>
    </div>
  );
}
