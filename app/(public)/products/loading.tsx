"use client";

import { Skeleton } from "@/components/ui/skeleton";

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

function FilterPanelSkeleton() {
  return (
    <div className="flex flex-col gap-5 w-56">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-px w-full" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-20" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-20" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-8 flex-1" />
        </div>
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Mobile: search bar + title row */}
        <div className="mb-4 flex flex-col gap-3 lg:hidden">
          <Skeleton className="h-9 w-full" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <div className="hidden lg:block sticky top-4 self-start">
            <FilterPanelSkeleton />
          </div>

          {/* Main content */}
          <div className="flex flex-1 flex-col gap-6 min-w-0">
            {/* Header + search bar row */}
            <div className="hidden lg:flex lg:items-center lg:gap-6">
              <div className="flex flex-1 items-center justify-between min-w-0">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-4 w-44" />
              </div>
              <Skeleton className="h-9 w-72 shrink-0" />
            </div>

            {/* Mobile count line */}
            <Skeleton className="h-4 w-24 lg:hidden" />

            {/* Product grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-9 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
