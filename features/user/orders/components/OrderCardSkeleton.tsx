import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function OrderCardSkeleton() {
  return (
    <Card className="w-full">
      <CardContent className="p-4 sm:p-5">
        {/* Header row: org info + status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            {/* Org avatar */}
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-1.5">
              {/* Org name */}
              <Skeleton className="h-4 w-32" />
              {/* Order ID */}
              <Skeleton className="h-3.5 w-24" />
            </div>
          </div>
          {/* Status badge */}
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Middle row: items + total */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Footer row: date + payment badge */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
