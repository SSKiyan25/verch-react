import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function OrderDetailLoading() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Back button */}
      <Skeleton className="h-8 w-28 rounded-md" />

      {/* Order header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            {/* Org name */}
            <Skeleton className="h-8 w-48" />
            {/* Order number */}
            <Skeleton className="h-4 w-36" />
          </div>
          {/* Status badge */}
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        {/* Date */}
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Status timeline card */}
      <Card className="shadow-sm">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center justify-between gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-3 w-12 hidden sm:block" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Order items card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-md shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-3 w-10 ml-auto" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Financial summary card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Separator className="my-1" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardContent>
      </Card>

      {/* Payment information card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-44" />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment method row */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-40" />
          </div>
          {/* Payment status */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          {/* Upload proof / proof image placeholder */}
          <Skeleton className="h-24 w-full rounded-lg" />

          <Separator />

          {/* Invoice section */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-36 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
