"use client";

import * as React from "react";
import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { PublicProductVariationDetail } from "@/lib/supabase/queries/products";
import { getStockLabel } from "../utils/stockLabel";
import { getCustomAttributes, getAllAttributes } from "../utils/safeAttributes";

const INITIAL_VISIBLE = 4;

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

type Props = {
  variations: PublicProductVariationDetail[];
  selectedVariation: PublicProductVariationDetail | null;
  onSelectVariation: (variation: PublicProductVariationDetail) => void;
};

export function ProductVariantCards({
  variations,
  selectedVariation,
  onSelectVariation,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  if (variations.length === 0) return null;

  const showToggle = variations.length > INITIAL_VISIBLE;
  const visible = expanded ? variations : variations.slice(0, INITIAL_VISIBLE);
  const hiddenCount = variations.length - INITIAL_VISIBLE;

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Variants ({variations.length})
        </span>
      </div>

      {/* Card grid */}
      <div className="flex flex-wrap gap-2">
        {visible.map((variation) => {
          const isSelected = selectedVariation?.id === variation.id;
          const unavailable = !variation.is_available;
          const stock = getStockLabel(variation);

          const customAttributes = getCustomAttributes(variation.attributes);
          const allAttributes = getAllAttributes(variation.attributes);

          return (
            <div key={variation.id} className="relative w-28">
              {/* Selection button — covers full card */}
              <button
                type="button"
                onClick={() => !unavailable && onSelectVariation(variation)}
                disabled={unavailable}
                aria-pressed={isSelected}
                className={cn(
                  "w-full min-h-[80px] flex flex-col justify-between gap-1 rounded-lg border p-3 pr-6 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/8 ring-1 ring-primary"
                    : unavailable
                      ? "cursor-not-allowed border opacity-50 bg-card"
                      : "bg-card hover:border-primary/60 hover:bg-primary/5",
                )}
              >
                {/* Top: attributes (primary) + name (secondary) */}
                <span className="flex flex-col gap-1">
                  {customAttributes.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {customAttributes.map(([key, val]) => (
                        <span
                          key={key}
                          className={cn(
                            "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap",
                            isSelected
                              ? "bg-primary/12 text-primary"
                              : "bg-muted-foreground/10 text-foreground",
                          )}
                        >
                          {key}: {val}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "truncate text-sm font-semibold leading-tight",
                        isSelected ? "text-primary" : "text-foreground",
                      )}
                    >
                      {variation.variation_name ?? "Variant"}
                    </span>
                  )}
                  {customAttributes.length > 0 && variation.variation_name && (
                    <span className="truncate text-[11px] text-muted-foreground leading-tight">
                      {variation.variation_name}
                    </span>
                  )}
                </span>

                {/* Bottom: stock label */}
                <span
                  className={cn(
                    "text-[10px] font-medium leading-tight",
                    stock.cls,
                  )}
                >
                  {stock.text}
                </span>
              </button>

              {/* Info popover — absolutely positioned, does not trigger card selection */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    aria-label={`Details for ${variation.variation_name ?? "Variant"}`}
                    className={cn(
                      "absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full transition-colors",
                      isSelected
                        ? "text-primary/60 hover:text-primary hover:bg-primary/10"
                        : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted",
                      unavailable && "opacity-50",
                    )}
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="start"
                  className="w-60 p-0 text-sm"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  {/* Popover header */}
                  <div className="px-4 py-3 border-b">
                    <p className="font-semibold leading-tight text-foreground">
                      {variation.variation_name ?? "Variant"}
                    </p>
                    {variation.sku && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        SKU: {variation.sku}
                      </p>
                    )}
                  </div>

                  <div className="px-4 py-3 space-y-3">
                    {/* Price row */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-bold text-primary tabular-nums">
                        {formatPrice(variation.price)}
                      </span>
                      {variation.compare_at_price != null && (
                        <span className="text-xs text-muted-foreground line-through tabular-nums">
                          {formatPrice(variation.compare_at_price)}
                        </span>
                      )}
                    </div>

                    {/* Attributes */}
                    {allAttributes.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-1">
                          {allAttributes.map(([key, val]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="text-xs text-muted-foreground">
                                {key}
                              </span>
                              <span className="text-xs font-medium text-foreground">
                                {val}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Stock info */}
                    <Separator />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          Available
                        </span>
                        <span className="text-xs font-medium tabular-nums">
                          {variation.available_quantity}
                        </span>
                      </div>
                      {variation.pre_order_quantity > 0 && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            Pre-order
                          </span>
                          <span className="text-xs font-medium tabular-nums text-amber-600">
                            {variation.pre_order_quantity}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          Status
                        </span>
                        <span className={cn("text-xs font-medium", stock.cls)}>
                          {stock.text}
                        </span>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          );
        })}
      </div>

      {/* Show more / Show less toggle */}
      {showToggle && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Show less" : `Show more (${hiddenCount})`}
        </Button>
      )}
    </div>
  );
}
