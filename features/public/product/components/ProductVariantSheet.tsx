"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PublicProductVariationDetail } from "@/lib/supabase/queries/products";
import type { SheetMode } from "../hooks/useProductVariant";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getStockLabel(v: PublicProductVariationDetail) {
  if (!v.is_available)
    return { text: "Unavailable", cls: "text-muted-foreground" };
  if (v.available_quantity === 0) {
    if (v.pre_order_quantity > 0)
      return { text: "Pre-order", cls: "text-amber-600" };
    return { text: "Out of stock", cls: "text-destructive" };
  }
  if (v.available_quantity <= 10)
    return { text: `${v.available_quantity} left`, cls: "text-amber-600" };
  return { text: "In stock", cls: "text-emerald-600" };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SheetMode | null;
  variations: PublicProductVariationDetail[];
  selectedVariation: PublicProductVariationDetail | null;
  onSelectVariation: (variation: PublicProductVariationDetail) => void;
  onConfirm: () => void;
};

export function ProductVariantSheet({
  open,
  onOpenChange,
  mode,
  variations,
  selectedVariation,
  onSelectVariation,
  onConfirm,
}: Props) {
  const isMobile = useIsMobile();
  const [quantity, setQuantity] = useState(1);
  const [prevVariationId, setPrevVariationId] = useState<string | undefined>(
    selectedVariation?.id,
  );

  // Reset quantity when the selected variation changes (React-recommended pattern)
  if (prevVariationId !== selectedVariation?.id) {
    setPrevVariationId(selectedVariation?.id);
    setQuantity(1);
  }

  const maxQty =
    selectedVariation && selectedVariation.available_quantity > 0
      ? selectedVariation.available_quantity
      : 1;

  const isOutOfStock =
    selectedVariation !== null && selectedVariation.available_quantity === 0;

  const canConfirm =
    !!selectedVariation &&
    selectedVariation.is_available &&
    (!isOutOfStock || selectedVariation.pre_order_quantity > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col p-0",
          isMobile ? "h-[82dvh] rounded-t-2xl" : "w-[400px] sm:max-w-[400px]",
        )}
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 shrink-0">
          <SheetTitle>
            {mode === "preorder"
              ? "Choose Variant to Pre-order"
              : "Choose Variant"}
          </SheetTitle>
        </SheetHeader>
        <Separator className="shrink-0" />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Unified variation list */}
          <div className="divide-y divide-border border-b">
            {variations.map((variation) => {
              const isSelected = selectedVariation?.id === variation.id;
              const unavailable = !variation.is_available;
              const stock = getStockLabel(variation);

              const customAttributes = Object.entries(
                variation.attributes,
              ).filter(([k]) => k !== "Variant");

              return (
                <button
                  key={variation.id}
                  type="button"
                  onClick={() => !unavailable && onSelectVariation(variation)}
                  disabled={unavailable}
                  aria-pressed={isSelected}
                  className={cn(
                    "w-full flex items-center gap-3 px-5 py-3 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "bg-primary/8 border-l-[3px] border-l-primary"
                      : unavailable
                        ? "cursor-not-allowed bg-muted/20 opacity-50"
                        : "bg-background hover:bg-muted/40",
                  )}
                >
                  {/* Radio dot */}
                  <span
                    className={cn(
                      "shrink-0 h-4 w-4 rounded-full border-2 transition-colors",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/40 bg-transparent",
                    )}
                  />

                  {/* Name + attribute chips */}
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

                  {/* Price + stock */}
                  <span className="shrink-0 flex flex-col items-end gap-px">
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums leading-tight",
                        isSelected ? "text-primary" : "text-foreground",
                      )}
                    >
                      {formatPrice(variation.price)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium leading-tight",
                        stock.cls,
                      )}
                    >
                      {stock.text}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected variation summary + quantity */}
          {selectedVariation && (
            <div className="px-5 py-4 space-y-4">
              {/* Summary card */}
              <div className="rounded-lg border bg-muted/30 p-3.5 space-y-1.5">
                <p className="text-sm font-semibold text-foreground">
                  {selectedVariation.variation_name ?? "Variant"}
                  {Object.entries(selectedVariation.attributes)
                    .filter(([k]) => k !== "Variant")
                    .map(([k, v]) => ` · ${k}: ${v}`)
                    .join("")}
                </p>
                <div className="flex items-baseline gap-2">
                  {selectedVariation.compare_at_price != null && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(selectedVariation.compare_at_price)}
                    </span>
                  )}
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(selectedVariation.price)}
                  </span>
                </div>
                {selectedVariation.sku && (
                  <p className="text-[11px] text-muted-foreground/60">
                    SKU: {selectedVariation.sku}
                  </p>
                )}
              </div>

              {/* Quantity stepper — only for in-stock items */}
              {!isOutOfStock && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quantity</span>
                  <div className="flex items-center gap-1 rounded-md border">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="flex h-8 w-8 items-center justify-center rounded-l-md transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[2.5rem] text-center text-sm font-medium tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.min(maxQty, q + 1))
                      }
                      disabled={quantity >= maxQty}
                      className="flex h-8 w-8 items-center justify-center rounded-r-md transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Max {maxQty}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t bg-background px-5 py-4">
          <Button className="w-full" disabled={!canConfirm} onClick={onConfirm}>
            {!selectedVariation
              ? "Select a variant to continue"
              : mode === "preorder"
                ? "Pre-order"
                : "Add to Cart"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
