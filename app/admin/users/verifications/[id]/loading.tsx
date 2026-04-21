import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header skeleton */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-48" />
      </div>

      {/* ID Photo card skeleton */}
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
          <Skeleton className="h-10 w-full mt-3" />
        </CardContent>
      </Card>

      {/* Student info card skeleton */}
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-40 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex justify-between py-2 border-b">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action buttons skeleton */}
      <div className="flex gap-3 p-4 border rounded-lg">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
    </div>
  );
}
