import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function OrderCardSkeleton() {
  return (
    <Card className="w-full shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Org info skeleton */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          {/* Right: Status badge + chevron skeleton */}
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
        </div>
        {/* Bottom row skeleton - item count and total */}
        <div className="mt-4 flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}
