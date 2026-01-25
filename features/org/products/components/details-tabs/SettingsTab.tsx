"use client";

import { useState } from "react";
import { ProductWithDetails, ProductStatus } from "@/lib/types/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEditProduct } from "../../hooks/useEditProduct";
import { useUser } from "@/lib/hooks/use-user";

interface SettingsTabProps {
  product: ProductWithDetails;
}

export function SettingsTab({ product }: SettingsTabProps) {
  const { user } = useUser();

  const [formData, setFormData] = useState({
    status: product.status || "draft",
    is_approved: product.is_approved || false,
    can_pre_order: product.can_pre_order || false,
    is_archived: product.is_archived || false,
  });

  const { updateProduct, isLoading, globalError, fieldErrors, clearErrors } =
    useEditProduct({
      onSuccess: (updatedProduct) => {
        console.log("Product settings updated successfully:", updatedProduct);
        // TODO: Show success toast or update parent state
      },
      onError: (error) => {
        console.error("Failed to update settings:", error);
      },
    });

  const handleSave = async () => {
    if (!user?.organization_id) {
      console.error("No organization ID found");
      return;
    }

    // Clear any previous errors
    clearErrors();

    try {
      const updateData = {
        status: formData.status as ProductStatus,
        is_approved: formData.is_approved,
        can_pre_order: formData.can_pre_order,
        is_archived: formData.is_archived,
      };

      console.log("Settings form data:", formData);
      console.log("Settings update data:", updateData);

      await updateProduct(user.organization_id, product.id, updateData);
    } catch (error) {
      // Error handling is done in the hook
      console.error("Settings save failed:", error);
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Product Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure product status and permissions
        </p>
      </div>

      {/* Global Error */}
      {globalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Product Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: value as ProductStatus,
                  }))
                }
              >
                <SelectTrigger
                  className={fieldErrors.status ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-800"
                      >
                        {formatStatus("draft")}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Work in progress
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="published">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500 text-white">
                        {formatStatus("published")}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Live and visible
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pending_approval">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-500 text-white">
                        {formatStatus("pending_approval")}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Awaiting review
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="archived">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-500 text-white">
                        {formatStatus("archived")}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Hidden from customers
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.status && (
                <p className="text-sm text-red-500">{fieldErrors.status}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Permissions & Features */}
        <Card>
          <CardHeader>
            <CardTitle>Permissions & Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Approval */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Product Approved</Label>
                <p className="text-sm text-muted-foreground">
                  Mark this product as approved for sale
                </p>
              </div>
              <Switch
                checked={formData.is_approved}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_approved: checked }))
                }
              />
            </div>

            {/* Pre-order */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Allow Pre-orders</Label>
                <p className="text-sm text-muted-foreground">
                  Customers can order even when out of stock
                </p>
              </div>
              <Switch
                checked={formData.can_pre_order}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, can_pre_order: checked }))
                }
              />
            </div>

            {/* Archive */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Archive Product</Label>
                <p className="text-sm text-muted-foreground">
                  Archive this product (can be restored later)
                </p>
              </div>
              <Switch
                checked={formData.is_archived}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_archived: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* Guidelines */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-amber-900 mb-2">
            Settings Guidelines
          </h4>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Draft products are only visible to you and your team</li>
            <li>• Published products are visible to customers</li>
            <li>• Pending approval requires admin review before publishing</li>
            <li>• Archived products are hidden but can be restored</li>
            <li>• Pre-orders allow sales when inventory is zero</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
