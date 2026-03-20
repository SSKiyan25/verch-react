"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProductActionsProps = {
  canPreOrder: boolean;
  hasPurchasableVariations: boolean;
  isPending?: boolean;
  onAddToCart: () => void;
  onPreOrder: () => void;
};

export function ProductActions({
  canPreOrder,
  hasPurchasableVariations,
  isPending = false,
  onAddToCart,
  onPreOrder,
}: ProductActionsProps) {
  const isAddToCartDisabled =
    (!hasPurchasableVariations && !canPreOrder) || isPending;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        className="flex-1"
        disabled={isAddToCartDisabled}
        onClick={onAddToCart}
      >
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Add to Cart
      </Button>

      {canPreOrder && (
        <Button
          variant="outline"
          className="flex-1"
          disabled={isPending}
          onClick={onPreOrder}
        >
          Pre-order
        </Button>
      )}
    </div>
  );
}
