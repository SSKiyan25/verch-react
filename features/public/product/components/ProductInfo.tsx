"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type {
  PublicProductDetail,
  PublicProductVariationDetail,
} from "@/lib/supabase/queries/products";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

type ProductInfoProps = {
  product: PublicProductDetail;
  selectedVariation: PublicProductVariationDetail | null;
};

export function ProductInfo({ product, selectedVariation }: ProductInfoProps) {
  const [expanded, setExpanded] = useState(false);

  const allOutOfStock =
    product.variations.length > 0 &&
    product.variations.every((v) => v.available_quantity === 0);

  // Determine price display
  const priceDisplay = (() => {
    if (selectedVariation) {
      return (
        <div className="flex items-baseline gap-2">
          {selectedVariation.compare_at_price != null && (
            <span className="text-base text-muted-foreground line-through">
              {formatPrice(selectedVariation.compare_at_price)}
            </span>
          )}
          <span className="text-2xl font-bold text-primary">
            {formatPrice(selectedVariation.price)}
          </span>
        </div>
      );
    }

    // No variation selected: show price range (available variations only)
    if (product.variations.length === 0) return null;
    const available = product.variations.filter((v) => v.is_available);
    const pool = available.length > 0 ? available : product.variations;
    const prices = pool.map((v) => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return (
      <div className="text-2xl font-bold text-primary">
        {minPrice === maxPrice
          ? formatPrice(minPrice)
          : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`}
      </div>
    );
  })();

  const descriptionTooLong =
    product.description && product.description.length > 280;

  return (
    <div className="flex flex-col gap-4">
      {/* Name */}
      <h1 className="text-2xl font-bold leading-tight tracking-tight">
        {product.name}
      </h1>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2">
        {product.total_sales > 0 && (
          <Badge variant="secondary">{product.total_sales} sold</Badge>
        )}
        {product.can_pre_order && (
          <Badge variant="outline" className="border-amber-500 text-amber-600">
            Pre-order available
          </Badge>
        )}
        {allOutOfStock && <Badge variant="destructive">Out of stock</Badge>}
      </div>

      {/* Price */}
      {priceDisplay}

      {/* Description */}
      {product.description && (
        <div className="text-sm text-muted-foreground">
          <p
            className={
              descriptionTooLong && !expanded ? "line-clamp-4" : undefined
            }
          >
            {product.description}
          </p>
          {descriptionTooLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
