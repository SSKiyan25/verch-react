"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export function CartPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <Skeleton className="h-8 w-40" />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left column — cart items */}
        <div className="flex-1 space-y-6">
          {/* Org section skeleton × 2 */}
          {[1, 2].map((org) => (
            <div key={org} className="rounded-lg border p-4 space-y-4">
              {/* Org header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-5 w-36" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>

              <Separator />

              {/* Item rows × 2 */}
              {[1, 2].map((item) => (
                <div key={item} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-16 w-16 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}

              <Separator />

              {/* Org subtotal */}
              <div className="flex justify-end">
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          ))}
        </div>

        {/* Right column — order summary skeleton */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="rounded-lg border p-4 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Separator />
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <Separator />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Separator />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
