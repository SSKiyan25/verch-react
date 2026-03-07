"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "./ProductCard";
import type { PublicProductListItem } from "@/lib/supabase/queries/products";

type Props = {
  products: PublicProductListItem[];
  isLoading?: boolean;
  skeletonCount?: number;
};

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-20" />
        <div className="flex items-center gap-1.5 pt-1">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="text-4xl select-none">🛍️</div>
      <p className="text-lg font-semibold">No products found</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Try adjusting your filters or check back later for new arrivals.
      </p>
    </div>
  );
}

export function ProductsGrid({
  products,
  isLoading = false,
  skeletonCount = 8,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {isLoading ? (
        Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))
      ) : products.length === 0 ? (
        <EmptyState />
      ) : (
        products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))
      )}
    </div>
  );
}
