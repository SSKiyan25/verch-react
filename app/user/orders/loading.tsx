import { Skeleton } from "@/components/ui/skeleton";
import { OrderCardSkeleton } from "@/features/user/orders/components/OrderCardSkeleton";

export default function UserOrdersLoading() {
  return (
    <div className="container max-w-5xl w-full py-6 px-4 sm:px-6 space-y-6">
      {/* Page title + description */}
      <div className="space-y-1">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Status tabs — 7 tabs: All + 6 statuses */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-9 shrink-0 rounded-full ${i === 0 ? "w-12" : i === 6 ? "w-24" : "w-20"}`}
          />
        ))}
      </div>

      {/* Order cards */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>
    </div>
  );
}
