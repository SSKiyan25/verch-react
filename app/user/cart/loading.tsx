import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function CartLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page title */}
      <Skeleton className="h-8 w-32" />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left column — cart items skeleton */}
        <div className="flex-1 space-y-4">
          {/* Global select all skeleton */}
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Org sections skeleton × 2 */}
          {[1, 2].map((org) => (
            <div key={org} className="rounded-lg border">
              {/* Org header */}
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>

              <Separator />

              {/* Cart item skeleton × 2 */}
              <div className="divide-y">
                {[1, 2].map((item) => (
                  <div key={item} className="flex items-start gap-3 p-4 sm:items-center">
                    <Skeleton className="h-4 w-4 rounded shrink-0 mt-1 sm:mt-0" />
                    <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-md shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-4 w-full max-w-xs" />
                      <Skeleton className="h-3 w-32" />
                      <div className="flex items-center gap-3 mt-2">
                        <Skeleton className="h-9 w-28 rounded-md" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8 rounded shrink-0" />
                  </div>
                ))}
              </div>

              <Separator />

              {/* Org subtotal */}
              <div className="flex items-center justify-between p-4">
                <Skeleton className="h-4 w-24" />
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
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
