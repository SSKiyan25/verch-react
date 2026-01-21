"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { ProductWithDetails } from "@/lib/types/product";

interface AnalyticsTabProps {
  product: ProductWithDetails;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AnalyticsTab({ product }: AnalyticsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <BarChart3 className="w-5 h-5" />
          Sales Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          Analytics charts will be displayed here
        </p>
      </CardContent>
    </Card>
  );
}
