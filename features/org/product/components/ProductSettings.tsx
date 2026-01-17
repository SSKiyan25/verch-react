"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Info,
  Settings,
  Package,
  Percent,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { CreateProductData, ProductStatus } from "@/lib/types/product";
import { useProductValidation } from "../hooks/useProductValidation";

interface ProductSettingsProps {
  data: CreateProductData;
  onChange: (updates: Partial<CreateProductData>) => void;
}

export function ProductSettings({ data, onChange }: ProductSettingsProps) {
  const { errors, validateStatus } = useProductValidation(data);

  const getStatusBadge = (status: ProductStatus) => {
    const variants = {
      draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      published:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      pending_approval:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      archived: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return variants[status] || variants.draft;
  };

  const handleStatusChange = (value: ProductStatus) => {
    // Validate before updating
    const isValid = validateStatus(value);
    if (isValid) {
      onChange({ status: value });
    }
  };

  const handlePreOrderChange = (checked: boolean) => {
    onChange({ can_pre_order: checked });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Product Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Status Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <Label className="text-sm font-medium">
              Visibility & Status
              {errors.status && (
                <span className="text-xs text-red-500 ml-2">
                  ({errors.status})
                </span>
              )}
            </Label>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-sm">Product Status</Label>
              <Select
                value={data.status || "draft"}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger
                  className={`mt-2 ${errors.status ? "border-red-500" : ""}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      Draft
                    </div>
                  </SelectItem>
                  <SelectItem value="published">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Published
                    </div>
                  </SelectItem>
                  <SelectItem value="pending_approval">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      Pending Approval
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {errors.status && (
                <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.status}
                </div>
              )}
            </div>

            {/* Status Preview */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Current status:
              </span>
              <Badge className={getStatusBadge(data.status || "draft")}>
                {(data.status || "draft")
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </Badge>
            </div>

            {/* Status Info */}
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
              {(data.status || "draft") === "draft" && (
                <p>
                  🔒 <strong>Draft:</strong> Only visible to you - customers
                  cannot see this product
                </p>
              )}
              {data.status === "published" && (
                <p>
                  ✅ <strong>Published:</strong> Live and available for
                  customers to purchase
                </p>
              )}
              {data.status === "pending_approval" && (
                <p>
                  ⏳ <strong>Pending Approval:</strong> Waiting for admin review
                  before going live
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Settings Section */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <Label className="text-sm font-medium">Inventory Options</Label>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="preorder" className="text-sm">
                Allow Pre-orders
              </Label>
              <p className="text-xs text-muted-foreground">
                Let customers order when out of stock
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="preorder"
                checked={data.can_pre_order || false}
                onCheckedChange={handlePreOrderChange}
              />
              <span className="text-xs text-muted-foreground">
                {data.can_pre_order ? "Enabled" : "Click to enable"}
              </span>
            </div>
          </div>

          {data.can_pre_order && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription className="text-xs">
                Customers can place orders even when stock shows 0. Ensure you
                can fulfill pre-orders promptly.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Discount Settings Section */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            <Label className="text-sm font-medium">Pricing & Discounts</Label>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg border border-dashed">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Advanced Discount Features
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Set up percentage discounts, fixed amount reductions, bulk
                  pricing, and promotional campaigns for your products.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/50"
                  disabled
                >
                  <Sparkles className="w-3 h-3 mr-2" />
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Commission Info */}
        <Alert className="border-dashed">
          <Info className="w-4 h-4" />
          <AlertDescription className="text-xs">
            <strong>Platform Commission:</strong> Commission rates will be
            automatically calculated and added to final customer prices when
            backend integration is complete. Current pricing displays are for
            preview only.
          </AlertDescription>
        </Alert>

        {/* Validation Summary */}
        {Object.values(errors).some((error) => error !== null) && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Settings Validation:</strong> Some settings may have
              validation errors. Please review the form before saving your
              product.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
