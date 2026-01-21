"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Package, Tag } from "lucide-react";
import { ProductWithDetails } from "@/lib/types/product";
import { getVariationDisplayName } from "@/lib/utils/product-utils";

interface VariationsTabProps {
  product: ProductWithDetails;
}

export function VariationsTab({ product }: VariationsTabProps) {
  //   console.log("Rendering VariationsTab with product:", product);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Product Variations</h3>
          <p className="text-sm text-muted-foreground">
            Manage different options and stock levels
          </p>
        </div>
        <Button size="sm" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Variation
        </Button>
      </div>

      <div className="grid gap-4">
        {product.variations && product.variations.length > 0 ? (
          product.variations.map((variation) => (
            <Card key={variation.id} className="border-l-4 border-l-primary/20">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      {/* Highlighted variation name */}
                      <CardTitle className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        {getVariationDisplayName(variation)}
                      </CardTitle>
                      {variation.sku && (
                        <Badge variant="secondary" className="text-xs w-fit">
                          SKU: {variation.sku}
                        </Badge>
                      )}
                    </div>
                    {variation.attributes &&
                      Object.keys(variation.attributes).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(variation.attributes).map(
                            ([key, value]) => (
                              <Badge
                                key={key}
                                variant="outline"
                                className="text-xs"
                              >
                                {key}: {String(value)}
                              </Badge>
                            )
                          )}
                        </div>
                      )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto mt-2 sm:mt-0"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Enhanced stats grid with better mobile layout */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Price
                    </div>
                    <div className="font-bold text-lg text-green-600">
                      ₱{variation.price.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Available Stock
                    </div>
                    <div className="font-bold text-lg">
                      {variation.available_quantity}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Reserved
                    </div>
                    <div className="font-bold text-lg text-orange-600">
                      {variation.reserved_quantity}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Sold
                    </div>
                    <div className="font-bold text-lg text-blue-600">
                      {variation.completed_orders}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h4 className="font-medium mb-2">No variations found</h4>
              <p className="text-sm mb-4">
                Add variations to manage different options like size, color,
                material, etc.
              </p>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create First Variation
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
