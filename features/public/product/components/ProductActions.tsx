"use client";

import { Button } from "@/components/ui/button";
import type { PublicProductVariationDetail } from "@/lib/supabase/queries/products";

type ProductActionsProps = {
  selectedVariation: PublicProductVariationDetail | null;
  canPreOrder: boolean;
  onAddToCart: () => void;
  onPreOrder: () => void;
};

export function ProductActions({
  selectedVariation,
  canPreOrder,
  onAddToCart,
  onPreOrder,
}: ProductActionsProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button className="flex-1" onClick={onAddToCart}>
        {selectedVariation ? "Add to Cart" : "Select a Variant"}
      </Button>

      {canPreOrder && (
        <Button variant="outline" className="flex-1" onClick={onPreOrder}>
          Pre-order
        </Button>
      )}
    </div>
  );
}
