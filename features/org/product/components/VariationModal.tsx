/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Info, AlertCircle, Wand2, Trash2 } from "lucide-react";
import { sanitizeInput } from "@/lib/hooks/use-input-validation";

interface VariationModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingIndex: number | null;
  formData: {
    sku: string;
    attributes: Record<string, string>;
    variation_name: string;
    price: number;
    compare_at_price: number;
    stock_quantity: number;
  };
  errors: any;
  commissionRate: number;
  newAttrKey: string;
  setNewAttrKey: (value: string) => void;
  newAttrValue: string;
  setNewAttrValue: (value: string) => void;
  onSave: () => void;
  onGenerateSku: () => void;
  onFormFieldChange: (field: string, value: any) => void;
  onKeyDown: (e: React.KeyboardEvent, field?: string) => void;
  onAddAttribute: () => void;
  onRemoveAttribute: (key: string) => void;
  calculateFinalPrice: (price: number) => number;
}

export function VariationModal({
  isOpen,
  onClose,
  editingIndex,
  formData,
  errors,
  commissionRate,
  newAttrKey,
  setNewAttrKey,
  newAttrValue,
  setNewAttrValue,
  onSave,
  onGenerateSku,
  onFormFieldChange,
  onKeyDown,
  onAddAttribute,
  onRemoveAttribute,
  calculateFinalPrice,
}: VariationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>
            {editingIndex !== null ? "Edit Variation" : "Add Variation"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pricing Information Alert */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <strong>Pricing Guide:</strong>
              <ul className="mt-1 space-y-1 text-sm">
                <li>
                  • <strong>Your Price:</strong> Amount you receive per sale
                </li>
                <li>
                  • <strong>Compare At:</strong> Original/MSRP price (optional)
                </li>
                <li>
                  • <strong>Final Price:</strong> What customers pay (includes{" "}
                  {commissionRate.toFixed(1)}% commission)
                </li>
              </ul>
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                <strong>Current Commission Rate:</strong>{" "}
                {commissionRate.toFixed(1)}%
                <br />
                For commission rate inquiries, please contact Verch admin.
              </div>
            </AlertDescription>
          </Alert>

          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4">
            {/* Variation Name */}
            <div className="space-y-2">
              <Label htmlFor="variation-name">
                Variation Name*
                {errors.variation_name && (
                  <span className="text-xs text-red-500 ml-2">
                    ({errors.variation_name})
                  </span>
                )}
              </Label>
              <Input
                id="variation-name"
                placeholder="e.g., Red Large, Size M"
                value={formData.variation_name}
                onChange={(e) =>
                  onFormFieldChange("variation_name", e.target.value)
                }
                className={errors.variation_name ? "border-red-500" : ""}
                maxLength={100}
              />
              {errors.variation_name && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  {errors.variation_name}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Give this variation a descriptive name
              </p>
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <Label htmlFor="sku">
                SKU (Optional)
                {errors.sku && (
                  <span className="text-xs text-red-500 ml-2">
                    ({errors.sku})
                  </span>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="sku"
                  placeholder="e.g., PROD-RED-L"
                  value={formData.sku}
                  onChange={(e) => onFormFieldChange("sku", e.target.value)}
                  className={`flex-1 ${errors.sku ? "border-red-500" : ""}`}
                  maxLength={50}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGenerateSku}
                  disabled={
                    !formData.variation_name ||
                    formData.variation_name.trim().length < 2
                  }
                  title="Generate SKU automatically"
                  className="px-3"
                >
                  <Wand2 className="w-4 h-4" />
                </Button>
              </div>
              {errors.sku && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  {errors.sku}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Click the wand to auto-generate from product and variation
                names. To regenerate, clear the field first.
              </p>
            </div>
          </div>

          {/* Pricing - Mobile Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">
                Your Price* (₱)
                {errors.price && (
                  <span className="text-xs text-red-500 ml-2">
                    ({errors.price})
                  </span>
                )}
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.price || ""}
                onChange={(e) => onFormFieldChange("price", e.target.value)}
                className={errors.price ? "border-red-500" : ""}
              />
              {errors.price && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  {errors.price}
                </div>
              )}
              {formData.price > 0 && (
                <p className="text-xs text-green-600">
                  Customer pays: ₱
                  {calculateFinalPrice(formData.price).toFixed(2)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="compare-price">
                Compare At Price (₱){" "}
                <span className="text-muted-foreground opacity-50">
                  (Optional)
                </span>
                {errors.compare_at_price && (
                  <span className="text-xs text-red-500 ml-2">
                    ({errors.compare_at_price})
                  </span>
                )}
              </Label>
              <Input
                id="compare-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.compare_at_price || ""}
                onChange={(e) =>
                  onFormFieldChange("compare_at_price", e.target.value)
                }
                className={errors.compare_at_price ? "border-red-500" : ""}
              />
              {errors.compare_at_price && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  {errors.compare_at_price}
                </div>
              )}
            </div>
          </div>

          {/* Stock */}
          <div className="space-y-2">
            <Label htmlFor="stock">
              Initial Stock Quantity
              {errors.stock_quantity && (
                <span className="text-xs text-red-500 ml-2">
                  ({errors.stock_quantity})
                </span>
              )}
            </Label>
            <Input
              id="stock"
              type="number"
              min="0"
              placeholder="0"
              value={formData.stock_quantity || ""}
              onChange={(e) =>
                onFormFieldChange("stock_quantity", e.target.value)
              }
              className={errors.stock_quantity ? "border-red-500" : ""}
            />
            {errors.stock_quantity && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="w-3 h-3" />
                {errors.stock_quantity}
              </div>
            )}
          </div>

          {/* Attributes */}
          <div className="space-y-4">
            <div>
              <Label>Attributes (Size, Color, etc.)</Label>
              <p className="text-xs text-muted-foreground">
                Add properties that make this variation unique
              </p>
            </div>

            {/* Existing Attributes */}
            {Object.keys(formData.attributes).length > 0 && (
              <div className="space-y-2">
                {Object.entries(formData.attributes).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 p-3 bg-muted rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{key}:</span>
                      <span className="text-sm ml-1">{String(value)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveAttribute(key)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Attribute - Mobile Responsive */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Property (e.g., Size)"
                  value={newAttrKey}
                  onChange={(e) =>
                    setNewAttrKey(sanitizeInput.text(e.target.value))
                  }
                  onKeyDown={(e) => onKeyDown(e, "attribute")}
                  maxLength={50}
                />
                <Input
                  placeholder="Value (e.g., Large)"
                  value={newAttrValue}
                  onChange={(e) =>
                    setNewAttrValue(sanitizeInput.text(e.target.value))
                  }
                  onKeyDown={(e) => onKeyDown(e, "attribute")}
                  maxLength={100}
                />
              </div>
              <Button
                variant="outline"
                onClick={onAddAttribute}
                disabled={!newAttrKey.trim() || !newAttrValue.trim()}
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Attribute
              </Button>
              <p className="text-xs text-muted-foreground">
                Click &quot;Add Attribute&quot; to add your customized
                attributes to the variation.
              </p>
            </div>
          </div>

          {/* Actions - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={
                !formData.price ||
                formData.price <= 0 ||
                Object.values(errors).some((error) => error !== null)
              }
              className="flex-1"
            >
              {editingIndex !== null ? "Update" : "Add"} Variation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
