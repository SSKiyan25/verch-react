"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PublicProductListItem } from "@/lib/supabase/queries/products";
import { useRouter } from "next/navigation";

type Props = {
  product: PublicProductListItem;
};

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getPriceDisplay(variations: PublicProductListItem["variations"]): {
  label: string;
  compareAt: number | null;
} {
  if (variations.length === 0) return { label: "—", compareAt: null };

  const available = variations.filter((v) => v.is_available);
  const pool = available.length > 0 ? available : variations;

  const prices = pool.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const hasRange = min !== max;
  const compareAt =
    !hasRange && pool[0]?.compare_at_price != null
      ? pool[0].compare_at_price
      : null;

  return {
    label: hasRange
      ? `${formatPrice(min)} – ${formatPrice(max)}`
      : formatPrice(min),
    compareAt,
  };
}

function isOutOfStock(
  variations: PublicProductListItem["variations"],
): boolean {
  return (
    variations.length > 0 && variations.every((v) => v.available_quantity === 0)
  );
}

export function ProductCard({ product }: Props) {
  const { label: priceLabel, compareAt } = getPriceDisplay(product.variations);
  const outOfStock = isOutOfStock(product.variations);
  const router = useRouter();

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Product Image */}
      <div className="relative aspect-square w-full bg-muted overflow-hidden">
        {product.featured_photo_url ? (
          <Image
            src={product.featured_photo_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4="
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.can_pre_order && !outOfStock && (
            <Badge variant="secondary" className="text-xs">
              Pre-order
            </Badge>
          )}
          {outOfStock && (
            <Badge variant="outline" className="bg-background/80 text-xs">
              Out of stock
            </Badge>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col gap-2 p-3">
        {/* Category */}
        {product.category_name && (
          <Badge variant="outline" className="w-fit text-xs">
            {product.category_name}
          </Badge>
        )}

        {/* Product Name */}
        <p className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-base">{priceLabel}</span>
          {compareAt != null && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(compareAt)}
            </span>
          )}
        </div>

        {/* Organization */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/store/${product.organization_id}`);
          }}
          className="flex items-center gap-1.5 mt-auto pt-1 hover:underline focus-visible:outline-none bg-transparent border-none p-0 text-left cursor-pointer"
          tabIndex={0}
        >
          <Avatar className="h-4 w-4">
            <AvatarImage src={product.organization_logo_url ?? undefined} />
            <AvatarFallback className="text-[8px]">
              {product.organization_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {product.organization_name}
          </span>
        </button>
      </div>
    </Link>
  );
}
