"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { ProductWithDetails } from "@/lib/types/product";

interface OrdersTabProps {
  product: ProductWithDetails;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function OrdersTab({ product }: OrdersTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <ShoppingCart className="w-5 h-5" />
          Recent Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          Order history will be displayed here
        </p>
      </CardContent>
    </Card>
  );
}
