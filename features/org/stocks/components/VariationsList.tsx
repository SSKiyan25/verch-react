/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ProductWithDetails } from "@/lib/types/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VariationStockItem } from "./VariationStockItem";

interface StockAdjustment {
  variationId: string;
  adjustment: number;
  reason: string;
  action: "add" | "remove" | "adjust" | "return";
}

interface VariationsListProps {
  product: ProductWithDetails;
  adjustments: Record<string, StockAdjustment>;
  getNewStock: (variation: any) => number;
  getNewReserved: (variation: any) => number;
  onStockChange: (
    variationId: string,
    value: number,
    action: StockAdjustment["action"]
  ) => void;
  onReasonChange: (variationId: string, reason: string) => void;
}

export function VariationsList({
  product,
  adjustments,
  getNewStock,
  getNewReserved,
  onStockChange,
  onReasonChange,
}: VariationsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Stock Management</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-0">
          {product.variations?.map((variation, index) => (
            <div key={variation.id}>
              <VariationStockItem
                variation={variation}
                adjustment={adjustments[variation.id]}
                newStock={getNewStock(variation)}
                newReserved={getNewReserved(variation)}
                onStockChange={onStockChange}
                onReasonChange={onReasonChange}
              />
              {index < (product.variations?.length || 0) - 1 && (
                <div className="border-b border-border/50" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
