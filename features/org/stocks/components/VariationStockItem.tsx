"use client";

import { useState } from "react";
import { ProductVariation } from "@/lib/types/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, Minus, ChevronDown, AlertTriangle } from "lucide-react";
import { getVariationDisplayName } from "@/lib/utils/product-utils";

interface StockAdjustment {
  variationId: string;
  adjustment: number;
  reason: string;
  action: "add" | "remove" | "adjust" | "return";
}

interface VariationStockItemProps {
  variation: ProductVariation;
  adjustment?: StockAdjustment;
  newStock: number;
  newReserved: number;
  onStockChange: (
    variationId: string,
    value: number,
    action: StockAdjustment["action"]
  ) => void;
  onReasonChange: (variationId: string, reason: string) => void;
}

export function VariationStockItem({
  variation,
  adjustment,
  newStock,
  newReserved,
  onStockChange,
  onReasonChange,
}: VariationStockItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isLowStock = newStock < 10 && newStock > 0;
  const isOutOfStock = newStock === 0;
  const hasChanges =
    adjustment &&
    (adjustment.adjustment !== 0 || adjustment.reason.trim() !== "");

  const handleAdjustmentChange = (value: number) => {
    const action = adjustment?.action || "adjust";
    onStockChange(variation.id, value, action);
  };

  const handleActionChange = (action: StockAdjustment["action"]) => {
    onStockChange(variation.id, adjustment?.adjustment || 0, action);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-3">
      <div className="border border-border rounded-lg overflow-hidden bg-white shadow-sm">
        <CollapsibleTrigger asChild>
          <div className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              {/* Product info */}
              <div className="flex-1 min-w-0">
                {/* Variation Name - PROMINENT */}
                <h3 className="font-semibold text-base md:text-lg mb-2 text-foreground">
                  {getVariationDisplayName(variation)}
                </h3>

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {variation.sku && (
                    <Badge variant="outline" className="text-xs font-medium">
                      SKU: {variation.sku}
                    </Badge>
                  )}
                  {(isOutOfStock || isLowStock) && (
                    <Badge
                      className={`text-xs ${
                        isOutOfStock
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-yellow-100 text-yellow-700 border-yellow-200"
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {isOutOfStock ? "Out of Stock" : "Low Stock"}
                    </Badge>
                  )}
                  {hasChanges && (
                    <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                      Modified
                    </Badge>
                  )}
                </div>

                {/* Price and Reserved */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-medium">
                    ₱{variation.price.toFixed(2)}
                  </span>
                  <span className="text-xs">Reserved: {newReserved}</span>
                </div>
              </div>

              {/* Stock Display */}
              <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                <div className="text-left md:text-right">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Current Stock
                  </div>
                  <div
                    className={`font-bold text-2xl md:text-3xl ${
                      newStock !== variation.available_quantity
                        ? newStock > variation.available_quantity
                          ? "text-green-600"
                          : "text-red-600"
                        : "text-foreground"
                    }`}
                  >
                    {variation.available_quantity}
                    {newStock !== variation.available_quantity && (
                      <>
                        <span className="mx-2 text-muted-foreground text-xl">
                          →
                        </span>
                        <span>{newStock}</span>
                      </>
                    )}
                  </div>
                </div>

                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border bg-muted/30 p-4">
            <div className="space-y-4">
              {/* Action selector */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Action Type
                </Label>
                <Select
                  value={adjustment?.action || "add"}
                  onValueChange={handleActionChange}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Stock</SelectItem>
                    <SelectItem value="remove">Remove Stock</SelectItem>
                    <SelectItem value="adjust">Set Stock to</SelectItem>
                    <SelectItem value="return">Return Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount controls */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {adjustment?.action === "adjust"
                    ? "Set Stock To"
                    : "Amount to Adjust"}
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentAdj = adjustment?.adjustment || 0;
                      handleAdjustmentChange(Math.max(0, currentAdj - 1));
                    }}
                    className="h-11 w-11 p-0 shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    value={adjustment?.adjustment || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      handleAdjustmentChange(value);
                    }}
                    className="text-center h-11 text-lg font-semibold"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentAdj = adjustment?.adjustment || 0;
                      handleAdjustmentChange(currentAdj + 1);
                    }}
                    className="h-11 w-11 p-0 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Preview */}
                {adjustment && adjustment.adjustment !== 0 && (
                  <div className="mt-3 p-3 bg-background border border-border rounded-md text-sm">
                    <span className="text-muted-foreground">
                      New stock will be:{" "}
                    </span>
                    <span
                      className={`font-bold text-base ${getQuantityChangeColor(
                        newStock - variation.available_quantity
                      )}`}
                    >
                      {newStock}
                    </span>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <Label
                  htmlFor={`reason-${variation.id}`}
                  className="text-sm font-medium mb-2 block"
                >
                  Reason{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id={`reason-${variation.id}`}
                  placeholder="e.g., Received new shipment, Damaged items removed..."
                  value={adjustment?.reason || ""}
                  onChange={(e) => onReasonChange(variation.id, e.target.value)}
                  className="h-20 md:h-24 resize-none text-sm"
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function getQuantityChangeColor(change: number) {
  if (change > 0) return "text-green-600";
  if (change < 0) return "text-red-600";
  return "";
}
