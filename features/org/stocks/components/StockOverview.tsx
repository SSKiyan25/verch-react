"use client";

import Image from "next/image";
import { ProductWithDetails } from "@/lib/types/product";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Package } from "lucide-react";

interface StockOverviewProps {
  product: ProductWithDetails;
  totalAdjustment: number;
  hasChanges: boolean;
}

export function StockOverview({
  product,
  totalAdjustment,
  hasChanges,
}: StockOverviewProps) {
  const totalStock =
    product.variations?.reduce((total, v) => total + v.available_quantity, 0) ||
    0;

  const totalReserved =
    product.variations?.reduce((total, v) => total + v.reserved_quantity, 0) ||
    0;

  const isLowStock = totalStock < 10 && totalStock > 0;
  const isOutOfStock = totalStock === 0;

  return (
    <div className="space-y-4">
      {/* Product Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
              {product.featured_photo_url ? (
                <Image
                  src={product.featured_photo_url}
                  alt={product.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Package className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-lg leading-tight">
                {product.name}
              </h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {product.category && (
                  <Badge variant="outline" className="text-xs">
                    {product.category.name}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {product.variations?.length || 0} variations
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Stock Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-lg font-bold">{totalStock}</div>
              <div className="text-xs text-muted-foreground">Total Stock</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-lg font-bold">{totalReserved}</div>
              <div className="text-xs text-muted-foreground">Reserved</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-lg font-bold">
                {product.variations?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Variations</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div
                className={`text-lg font-bold ${
                  totalAdjustment >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {totalAdjustment >= 0 ? "+" : ""}
                {totalAdjustment}
              </div>
              <div className="text-xs text-muted-foreground">Adjustment</div>
            </div>
          </div>

          {/* Alerts */}
          {(isOutOfStock || isLowStock || hasChanges) && (
            <div className="space-y-2">
              {isOutOfStock && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="text-sm text-red-700 font-medium">
                    Product is out of stock
                  </span>
                </div>
              )}
              {isLowStock && !isOutOfStock && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-amber-700 font-medium">
                    Stock is running low
                  </span>
                </div>
              )}
              {hasChanges && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-sm text-blue-700 font-medium">
                    You have unsaved changes
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
