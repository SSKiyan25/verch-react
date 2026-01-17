/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { ProductWithDetails } from "@/lib/types/product";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, Package, History, AlertTriangle } from "lucide-react";

interface StockManagementDialogProps {
  product: ProductWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StockAdjustment {
  variationId: string;
  adjustment: number;
  reason: string;
  action: "increase" | "decrease" | "adjustment";
}

export function StockManagementDialog({
  product,
  open,
  onOpenChange,
}: StockManagementDialogProps) {
  const [adjustments, setAdjustments] = useState<
    Record<string, StockAdjustment>
  >({});
  const [showHistory, setShowHistory] = useState(false);

  const handleStockChange = (
    variationId: string,
    value: number,
    action: "increase" | "decrease" | "adjustment"
  ) => {
    setAdjustments((prev) => ({
      ...prev,
      [variationId]: {
        variationId,
        adjustment: value,
        reason: prev[variationId]?.reason || "",
        action,
      },
    }));
  };

  const handleReasonChange = (variationId: string, reason: string) => {
    setAdjustments((prev) => ({
      ...prev,
      [variationId]: {
        ...prev[variationId],
        variationId,
        adjustment: prev[variationId]?.adjustment || 0,
        action: prev[variationId]?.action || "adjustment",
        reason,
      },
    }));
  };

  const getNewStock = (variation: any) => {
    const adj = adjustments[variation.id];
    if (!adj) return variation.available_quantity;

    switch (adj.action) {
      case "increase":
        return variation.available_quantity + Math.abs(adj.adjustment);
      case "decrease":
        return Math.max(
          0,
          variation.available_quantity - Math.abs(adj.adjustment)
        );
      case "adjustment":
        return Math.max(0, adj.adjustment);
      default:
        return variation.available_quantity;
    }
  };

  const hasChanges = Object.keys(adjustments).some((key) => {
    const adj = adjustments[key];
    return adj.adjustment !== 0 || adj.reason.trim() !== "";
  });

  const getTotalAdjustment = () => {
    return Object.values(adjustments).reduce((total, adj) => {
      switch (adj.action) {
        case "increase":
          return total + Math.abs(adj.adjustment);
        case "decrease":
          return total - Math.abs(adj.adjustment);
        default:
          return total;
      }
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Manage Stock - {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stock Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Stock</div>
                  <div className="font-semibold text-lg">
                    {product.variations?.reduce(
                      (total, v) => total + v.available_quantity,
                      0
                    ) || 0}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Reserved</div>
                  <div className="font-semibold text-lg">
                    {product.variations?.reduce(
                      (total, v) => total + v.reserved_quantity,
                      0
                    ) || 0}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Variations</div>
                  <div className="font-semibold text-lg">
                    {product.variations?.length || 0}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">
                    Pending Adjustment
                  </div>
                  <div
                    className={`font-semibold text-lg ${
                      getTotalAdjustment() >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {getTotalAdjustment() >= 0 ? "+" : ""}
                    {getTotalAdjustment()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variations Stock Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Variation Stock</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="w-4 h-4 mr-2" />
                {showHistory ? "Hide" : "Show"} History
              </Button>
            </div>

            {product.variations?.map((variation) => {
              const adjustment = adjustments[variation.id];
              const newStock = getNewStock(variation);
              const isLowStock = newStock < 10 && newStock > 0;
              const isOutOfStock = newStock === 0;

              return (
                <Card key={variation.id}>
                  <CardContent className="p-4 space-y-4">
                    {/* Variation Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {variation.variation_name ||
                              `${Object.values(variation.attributes).join(
                                ", "
                              )}`}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {variation.sku}
                          </Badge>
                          {(isOutOfStock || isLowStock) && (
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                isOutOfStock
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {isOutOfStock ? "Out of Stock" : "Low Stock"}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Price: ₱{variation.price.toFixed(2)} | Reserved:{" "}
                          {variation.reserved_quantity}
                        </div>
                      </div>
                    </div>

                    {/* Current vs New Stock */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Current Stock
                        </Label>
                        <div className="text-2xl font-bold">
                          {variation.available_quantity}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          New Stock
                        </Label>
                        <div
                          className={`text-2xl font-bold ${
                            newStock !== variation.available_quantity
                              ? newStock > variation.available_quantity
                                ? "text-green-600"
                                : "text-red-600"
                              : ""
                          }`}
                        >
                          {newStock}
                          {newStock !== variation.available_quantity && (
                            <span className="text-sm ml-2">
                              (
                              {newStock > variation.available_quantity
                                ? "+"
                                : ""}
                              {newStock - variation.available_quantity})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stock Adjustment Controls */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="min-w-0 text-sm">Action:</Label>
                        <Select
                          value={adjustment?.action || "adjustment"}
                          onValueChange={(
                            value: "increase" | "decrease" | "adjustment"
                          ) => {
                            handleStockChange(
                              variation.id,
                              adjustment?.adjustment || 0,
                              value
                            );
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="increase">Increase</SelectItem>
                            <SelectItem value="decrease">Decrease</SelectItem>
                            <SelectItem value="adjustment">Set to</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentAdj = adjustment?.adjustment || 0;
                              const action = adjustment?.action || "adjustment";
                              handleStockChange(
                                variation.id,
                                Math.max(0, currentAdj - 1),
                                action
                              );
                            }}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            value={adjustment?.adjustment || 0}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              const action = adjustment?.action || "adjustment";
                              handleStockChange(variation.id, value, action);
                            }}
                            className="w-20 text-center"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentAdj = adjustment?.adjustment || 0;
                              const action = adjustment?.action || "adjustment";
                              handleStockChange(
                                variation.id,
                                currentAdj + 1,
                                action
                              );
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label
                          htmlFor={`reason-${variation.id}`}
                          className="text-sm"
                        >
                          Reason (optional)
                        </Label>
                        <Textarea
                          id={`reason-${variation.id}`}
                          placeholder="Enter reason for stock adjustment..."
                          value={adjustment?.reason || ""}
                          onChange={(e) =>
                            handleReasonChange(variation.id, e.target.value)
                          }
                          className="h-20 resize-none"
                        />
                      </div>
                    </div>

                    {/* Stock History Preview */}
                    {showHistory && (
                      <div className="border-t pt-3">
                        <Label className="text-xs text-muted-foreground">
                          Recent Stock Changes
                        </Label>
                        <div className="text-sm text-muted-foreground mt-1">
                          {/* This would show actual stock logs from the database */}
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Jan 15, 2024 - Stock adjustment</span>
                              <span className="text-green-600">+50</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Jan 10, 2024 - Order fulfillment</span>
                              <span className="text-red-600">-5</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setAdjustments({});
                onOpenChange(false);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Here you would implement the stock update logic
                console.log("Stock adjustments:", adjustments);
                setAdjustments({});
                onOpenChange(false);
              }}
              disabled={!hasChanges}
              className="flex-1"
            >
              Update Stock
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
