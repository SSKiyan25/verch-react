"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ProductDetailLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center">
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    </div>
  );
}
