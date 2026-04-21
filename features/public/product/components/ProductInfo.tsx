"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type {
  PublicProductDetail,
  PublicProductVariationDetail,
} from "@/lib/supabase/queries/products";
import type { ProductActivePromotion } from "@/lib/types/public-promotions";
import { PriceWithPromotion } from "./PriceWithPromotion";
import { PromotionsList } from "./PromotionsList";

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
  promotions?: ProductActivePromotion[];
};

export function ProductInfo({
  product,
  selectedVariation,
  promotions = [],
}: ProductInfoProps) {
  const [expanded, setExpanded] = useState(false);

  const allOutOfStock =
    product.variations.length > 0 &&
    product.variations.every((v) => v.available_quantity === 0);

  // Get best eligible promotion for price display
  const bestPromotion = promotions.find((p) => p.isEligible) ?? null;

  // Determine price display
  const priceDisplay = (() => {
    if (selectedVariation) {
      return (
        <PriceWithPromotion
          price={selectedVariation.price}
          compareAtPrice={selectedVariation.compare_at_price}
          promotion={bestPromotion}
          size="lg"
        />
      );
    }

    // No variation selected: show price range (no promotions applied to range)
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

      {/* Promotions section */}
      {promotions.length > 0 && (
        <>
          <Separator className="my-2" />
          <PromotionsList promotions={promotions} maxDisplay={3} />
        </>
      )}
    </div>
  );
}
