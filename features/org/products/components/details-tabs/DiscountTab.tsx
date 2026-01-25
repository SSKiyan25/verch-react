/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { ProductWithDetails } from "@/lib/types/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Percent, Plus, Trash2, Calendar } from "lucide-react";

interface DiscountTabProps {
  product: ProductWithDetails;
}

export function DiscountTab({ product }: DiscountTabProps) {
  // TODO: Replace with actual discount data from product
  const hasDiscount = false;
  const discountType = "percentage"; // or "fixed_amount"
  const discountValue = 0;
  const discountStart = "";
  const discountEnd = "";

  const handleSaveDiscount = () => {
    // TODO: Implement save discount functionality
    console.log("Save discount");
  };

  const handleRemoveDiscount = () => {
    // TODO: Implement remove discount functionality
    console.log("Remove discount");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Product Discounts</h3>
          <p className="text-sm text-muted-foreground">
            Manage pricing discounts and promotional offers
          </p>
        </div>
        {hasDiscount && (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Active Discount
          </Badge>
        )}
      </div>

      {/* Discount Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Discount Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Discount */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Discount</Label>
              <p className="text-sm text-muted-foreground">
                Activate discount for this product
              </p>
            </div>
            <Switch checked={hasDiscount} />
          </div>

          {hasDiscount && (
            <>
              {/* Discount Type */}
              <div className="space-y-2">
                <Label htmlFor="discount-type">Discount Type</Label>
                <Select value={discountType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select discount type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">
                      Fixed Amount (₱)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Discount Value */}
              <div className="space-y-2">
                <Label htmlFor="discount-value">
                  Discount Value {discountType === "percentage" ? "(%)" : "(₱)"}
                </Label>
                <Input
                  id="discount-value"
                  type="number"
                  placeholder={discountType === "percentage" ? "10" : "100"}
                  value={discountValue}
                  min="0"
                  max={discountType === "percentage" ? "100" : undefined}
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date (Optional)</Label>
                  <Input
                    id="start-date"
                    type="datetime-local"
                    value={discountStart}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date (Optional)</Label>
                  <Input
                    id="end-date"
                    type="datetime-local"
                    value={discountEnd}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveDiscount}
                  className="flex-1 sm:flex-initial"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Save Discount
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRemoveDiscount}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Discount Preview */}
      {hasDiscount && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Discount Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">Original Price:</span>
                <span className="font-medium text-blue-900">₱199.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">Discount:</span>
                <span className="font-medium text-blue-900">
                  {discountType === "percentage"
                    ? `${discountValue}%`
                    : `₱${discountValue}`}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-blue-300 pt-3">
                <span className="text-base font-medium text-blue-800">
                  Final Price:
                </span>
                <span className="text-lg font-bold text-blue-900">₱159.00</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guidelines */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-amber-900 mb-2">
            Discount Guidelines
          </h4>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Percentage discounts cannot exceed 100%</li>
            <li>
              • Date ranges are optional - leave empty for permanent discount
            </li>
            <li>• Discounts apply to all product variations</li>
            <li>• Changes take effect immediately after saving</li>
            <li>• Customers will see both original and discounted prices</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
