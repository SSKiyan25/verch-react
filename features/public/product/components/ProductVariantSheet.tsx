"use client";

import { useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getStockLabel } from "../utils/stockLabel";
import { getCustomAttributes } from "../utils/safeAttributes";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function isVariantSelectable(
  variation: PublicProductVariationDetail,
  mode: SheetMode | null,
): boolean {
  if (!variation.is_available) return false; // never selectable regardless of mode
  if (mode === "preorder") return true; // available + any stock state = selectable for preorder
  return variation.available_quantity > 0; // add mode: must have stock
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SheetMode | null;
  variations: PublicProductVariationDetail[];
  selectedVariation: PublicProductVariationDetail | null;
  onSelectVariation: (variation: PublicProductVariationDetail) => void;
  onConfirm: (quantity: number) => void;
  isPending?: boolean;
};

export function ProductVariantSheet({
  open,
  onOpenChange,
  mode,
  variations,
  selectedVariation,
  onSelectVariation,
  onConfirm,
  isPending = false,
}: Props) {
  const isMobile = useIsMobile();
  const [quantity, setQuantity] = useState(1);
  const [inputDraft, setInputDraft] = useState("1");
  const [prevVariationId, setPrevVariationId] = useState<string | undefined>(
    selectedVariation?.id,
  );

  // Reset quantity when the selected variation changes (React-recommended pattern)
  if (prevVariationId !== selectedVariation?.id) {
    setPrevVariationId(selectedVariation?.id);
    setQuantity(1);
    setInputDraft("1");
  }

  const isOutOfStock =
    selectedVariation !== null && selectedVariation.available_quantity === 0;

  const maxQty =
    mode === "preorder"
      ? 1000
      : selectedVariation && selectedVariation.available_quantity > 0
        ? selectedVariation.available_quantity
        : 1;

  const canConfirm =
    mode === "preorder"
      ? !!selectedVariation && selectedVariation.is_available
      : !!selectedVariation &&
        selectedVariation.is_available &&
        selectedVariation.available_quantity > 0;

  const draftNum = parseInt(inputDraft, 10);
  const qtyWarning =
    inputDraft === "" || isNaN(draftNum)
      ? "Please enter a valid quantity."
      : draftNum < 1
        ? "Quantity must be at least 1."
        : draftNum > maxQty
          ? `Maximum quantity is ${maxQty.toLocaleString()}.`
          : null;

  const commitDraft = () => {
    const parsed = parseInt(inputDraft, 10);
    const clamped = isNaN(parsed) ? 1 : Math.min(maxQty, Math.max(1, parsed));
    setQuantity(clamped);
    setInputDraft(String(clamped));
  };

  const handleDecrement = () => {
    const next = Math.max(1, quantity - 1);
    setQuantity(next);
    setInputDraft(String(next));
  };

  const handleIncrement = () => {
    const next = Math.min(maxQty, quantity + 1);
    setQuantity(next);
    setInputDraft(String(next));
  };

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
            {mode === "preorder" ? "Pre-order" : "Add to Cart"}
          </SheetTitle>
        </SheetHeader>
        <Separator className="shrink-0" />
        {/* Hint */}
        <p className="px-5 pt-3 pb-1 text-xs text-muted-foreground shrink-0">
          Select a variant to see details and confirm your order.
        </p>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Variant list */}
          <div className="divide-y divide-border border-b">
            {variations.map((variation) => {
              const selectable = isVariantSelectable(variation, mode);
              const isSelected = selectedVariation?.id === variation.id;
              const stockLabel = getStockLabel(variation);
              const customAttrs = getCustomAttributes(variation.attributes);

              return (
                <button
                  key={variation.id}
                  type="button"
                  disabled={!selectable || isPending}
                  onClick={() =>
                    !isPending && selectable && onSelectVariation(variation)
                  }
                  className={cn(
                    "w-full px-5 py-3 text-left transition-colors",
                    selectable && !isPending
                      ? "hover:bg-muted/50 cursor-pointer"
                      : "opacity-50 cursor-not-allowed",
                    isSelected &&
                      "border-l-[3px] border-l-primary bg-primary/[0.08]",
                    !isSelected && "border-l-[3px] border-l-transparent",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                      {customAttrs.length > 0 ? (
                        <span className="flex flex-wrap gap-1">
                          {customAttrs.map(([key, val]) => (
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
                        <span className="text-sm font-medium text-foreground truncate">
                          {variation.variation_name ?? "Variant"}
                        </span>
                      )}
                      {customAttrs.length > 0 && variation.variation_name && (
                        <span className="truncate text-[11px] text-muted-foreground leading-tight">
                          {variation.variation_name}
                        </span>
                      )}
                    </span>
                    <span className={cn("text-xs shrink-0", stockLabel.cls)}>
                      {stockLabel.text}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatPrice(variation.price)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Hint when selected variant is unavailable in cart mode */}
          {mode === "cart" &&
            selectedVariation &&
            !isVariantSelectable(selectedVariation, mode) && (
              <p className="px-5 pt-3 text-xs text-destructive">
                Your selected variant is unavailable. Please choose another.
              </p>
            )}

          {/* Selected variation summary + quantity */}
          {selectedVariation && (
            <div className="px-5 py-4 space-y-4">
              {/* Summary card */}
              <div className="rounded-lg border bg-muted/30 p-3.5 space-y-1.5">
                {/* Attributes as prominent badges */}
                {(() => {
                  const attrs = getCustomAttributes(
                    selectedVariation.attributes,
                  );
                  return attrs.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {attrs.map(([key, val]) => (
                        <span
                          key={key}
                          className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                        >
                          {key}: {val}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <p className="text-sm font-semibold text-foreground">
                      {selectedVariation.variation_name ?? "Variant"}
                    </p>
                  );
                })()}
                {selectedVariation.variation_name &&
                  getCustomAttributes(selectedVariation.attributes).length >
                    0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {selectedVariation.variation_name}
                    </p>
                  )}
                <div className="flex items-baseline gap-2">
                  {selectedVariation.compare_at_price != null && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(selectedVariation.compare_at_price)}
                    </span>
                  )}
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(selectedVariation.price)}
                  </span>
                  <span className="text-xs text-muted-foreground">each</span>
                </div>
                {selectedVariation.sku && (
                  <p className="text-[11px] text-muted-foreground/60">
                    SKU: {selectedVariation.sku}
                  </p>
                )}
                {/* Subtotal */}
                {(!isOutOfStock || mode === "preorder") && (
                  <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      Subtotal ({quantity}×)
                    </span>
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {formatPrice(selectedVariation.price * quantity)}
                    </span>
                  </div>
                )}
              </div>

              {/* Quantity stepper — for in-stock items and pre-orders */}
              {(!isOutOfStock || mode === "preorder") && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium shrink-0">
                      Quantity
                    </span>
                    <div
                      className={cn(
                        "flex items-center rounded-md border overflow-hidden transition-colors",
                        qtyWarning && "border-destructive",
                      )}
                    >
                      <button
                        type="button"
                        onClick={handleDecrement}
                        disabled={quantity <= 1}
                        className="flex h-8 w-8 shrink-0 items-center justify-center transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={maxQty}
                        value={inputDraft}
                        onChange={(e) => setInputDraft(e.target.value)}
                        onBlur={commitDraft}
                        onKeyDown={(e) => e.key === "Enter" && commitDraft()}
                        className="h-8 w-14 rounded-none border-0 border-x text-center text-sm font-medium tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                        aria-label="Quantity"
                      />
                      <button
                        type="button"
                        onClick={handleIncrement}
                        disabled={quantity >= maxQty}
                        className="flex h-8 w-8 shrink-0 items-center justify-center transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      Max {maxQty.toLocaleString()}
                    </span>
                  </div>
                  {qtyWarning && (
                    <p className="text-xs text-destructive">{qtyWarning}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t bg-background px-5 py-4">
          <Button
            className="w-full"
            disabled={
              !selectedVariation || !canConfirm || !!qtyWarning || isPending
            }
            onClick={() => onConfirm(quantity)}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : !selectedVariation ? (
              "Select a variant to continue"
            ) : mode === "preorder" ? (
              "Confirm Pre-order"
            ) : (
              "Add to Cart"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
