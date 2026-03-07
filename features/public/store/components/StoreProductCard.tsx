import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import type { PublicProductListItem } from "@/lib/supabase/queries/products";

type StoreProductCardProps = {
  product: PublicProductListItem;
};

function formatPrice(price: number) {
  return `₱${price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export function StoreProductCard({ product }: StoreProductCardProps) {
  // Pricing logic
  const prices = product.variations.map((v) => v.price);
  const comparePrices = product.variations
    .map((v) => v.compare_at_price)
    .filter((v) => v != null) as number[];
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const allSamePrice =
    minPrice !== null && maxPrice !== null && minPrice === maxPrice;
  const hasCompare = comparePrices.some(
    (c, i) => c && prices[i] && c > prices[i],
  );
  const compareAt = hasCompare ? Math.max(...comparePrices) : null;

  // Availability badge
  const allOutOfStock =
    product.variations.length > 0 &&
    product.variations.every((v) => v.available_quantity === 0);
  let badge: { label: string; color: string } | null = null;
  if (allOutOfStock) {
    badge = product.can_pre_order
      ? {
          label: "Pre-order",
          color: "bg-amber-100 text-amber-700 border-amber-300",
        }
      : {
          label: "Out of stock",
          color: "bg-gray-200 text-gray-500 border-gray-300",
        };
  }

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {product.featured_photo_url ? (
          <Image
            src={product.featured_photo_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        {/* Badge */}
        {badge && (
          <span
            className={`absolute top-2 left-2 z-10 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.color}`}
          >
            {badge.label}
          </span>
        )}
      </div>
      {/* Body */}
      <div className="flex flex-1 flex-col gap-0.5 px-3 pb-3 pt-2.5">
        {/* Category */}
        {product.category_name && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70 truncate">
            {product.category_name}
          </span>
        )}
        {/* Name */}
        <h3 className="text-sm font-semibold text-foreground truncate leading-snug">
          {product.name}
        </h3>
        {/* Price row */}
        <div className="mt-1 flex items-baseline gap-1.5">
          {product.variations.length === 0 ? (
            <span className="text-sm text-muted-foreground">—</span>
          ) : allSamePrice ? (
            <span className="text-base font-bold text-primary">
              {formatPrice(minPrice!)}
            </span>
          ) : (
            <span className="text-base font-bold text-primary">
              From {formatPrice(minPrice!)}
            </span>
          )}
          {hasCompare && compareAt && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(compareAt)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
