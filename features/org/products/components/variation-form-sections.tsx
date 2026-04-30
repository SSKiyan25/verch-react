/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Tag,
  PhilippinePeso,
  Package,
  Hash,
  AlertCircle,
  Plus,
  X,
  Wand2,
  TrendingUp,
  Info,
} from "lucide-react";
import { VariationFormData } from "../utils/variation-validation";
import { generateSku } from "@/lib/utils/sku-generator";
import { Product, ProductVariation } from "@/lib/types/product";

// Helper for errors
const ErrorMessage = ({ error }: { error?: string }) => {
  if (!error) return null;
  return (
    <div className="flex items-center gap-1 text-sm text-red-600 mt-1">
      <AlertCircle className="w-4 h-4" />
      <span>{error}</span>
    </div>
  );
};

interface SectionProps {
  formData: VariationFormData;
  errors: Record<string, string>;
  onChange: (field: keyof VariationFormData, value: any) => void;
  product?: Partial<Product>;
  existingSkus?: string[];
  variationIndex?: number;
  existingVariations?: ProductVariation[];
  isEditing?: boolean; // Add this to know when we're editing
}

export function BasicInfoSection({
  formData,
  errors,
  onChange,
  product,
  existingSkus = [],
  variationIndex = 0,
}: SectionProps) {
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);

  const handleGenerateSku = () => {
    if (!formData.variation_name) {
      return;
    }

    setIsGeneratingSku(true);

    try {
      const generatedSku = generateSku({
        productName: product?.name || "Product",
        variationName: formData.variation_name,
        variationIndex: variationIndex,
        existingSkus: existingSkus,
      });

      onChange("sku", generatedSku);
    } catch (error) {
      console.error("Failed to generate SKU:", error);
    } finally {
      setTimeout(() => {
        setIsGeneratingSku(false);
      }, 300);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="w-4 h-4" /> Basic Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <Label htmlFor="variation_name">
            Variation Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="variation_name"
            value={formData.variation_name}
            onChange={(e) => onChange("variation_name", e.target.value)}
            className={`h-11 ${errors.variation_name ? "border-red-500" : ""}`}
            placeholder="e.g., Red Large, Premium Edition"
          />
          <ErrorMessage error={errors.variation_name} />
          <p className="text-xs text-muted-foreground">
            A descriptive name for this variation
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="sku">SKU (Optional)</Label>
          <div className="flex gap-2">
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => onChange("sku", e.target.value)}
              className={`h-11 flex-1 ${errors.sku ? "border-red-500" : ""}`}
              placeholder="e.g., PROD-001-RED-L"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 px-3 shrink-0"
              onClick={handleGenerateSku}
              disabled={!formData.variation_name || isGeneratingSku}
              title={
                !formData.variation_name
                  ? "Enter a variation name first"
                  : "Auto-generate SKU"
              }
            >
              {isGeneratingSku ? (
                <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
            </Button>
          </div>
          <ErrorMessage error={errors.sku} />
          <p className="text-xs text-muted-foreground">
            Unique identifier for inventory tracking. Click the wand to
            auto-generate.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PricingSection({
  formData,
  errors,
  onChange,
  existingVariations = [],
}: SectionProps) {
  const existingPrices = existingVariations
    .map((v) => v.price)
    .filter((price) => price > 0);

  const priceStats =
    existingPrices.length > 0
      ? {
          min: Math.min(...existingPrices),
          max: Math.max(...existingPrices),
          avg:
            existingPrices.reduce((a, b) => a + b, 0) / existingPrices.length,
        }
      : null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <PhilippinePeso className="w-4 h-4" /> Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {existingVariations.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <Label className="text-sm font-medium text-blue-800">
                Existing Variation Prices (Reference)
              </Label>
            </div>

            {priceStats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-white rounded border">
                  <div className="text-xs text-muted-foreground">Lowest</div>
                  <div className="text-sm font-semibold text-green-600">
                    ₱{priceStats.min.toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="text-xs text-muted-foreground">Average</div>
                  <div className="text-sm font-semibold text-blue-600">
                    ₱{priceStats.avg.toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="text-xs text-muted-foreground">Highest</div>
                  <div className="text-sm font-semibold text-orange-600">
                    ₱{priceStats.max.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-32 overflow-y-auto">
              {existingVariations.slice(0, 5).map((variation, index) => (
                <div
                  key={variation.id || index}
                  className="flex justify-between items-center text-sm bg-white p-2 rounded border"
                >
                  <div className="flex-1 truncate">
                    <span className="font-medium">
                      {variation.variation_name || `Variation ${index + 1}`}
                    </span>
                    {variation.sku && (
                      <span className="text-muted-foreground ml-2">
                        ({variation.sku})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-600">
                      ₱{variation.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              {existingVariations.length > 5 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  ... and {existingVariations.length - 5} more variations
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Label htmlFor="price">
            Price <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              ₱
            </span>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price === 0 ? "" : formData.price}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange("price", isNaN(val) ? 0 : val);
              }}
              className={`h-11 pl-8 ${errors.price ? "border-red-500" : ""}`}
              placeholder="0.00"
            />
          </div>
          <ErrorMessage error={errors.price} />
        </div>
      </CardContent>
    </Card>
  );
}

// Updated InventorySection with conditional rendering
export function InventorySection({
  formData,
  errors,
  onChange,
  isEditing = false,
}: SectionProps) {
  // For editing mode, show informational card instead
  if (isEditing) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" /> Inventory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-amber-800 mb-2">
                  Stock Management
                </h4>
                <p className="text-sm text-amber-700 mb-3">
                  To manage inventory levels for this variation, please use the
                  dedicated stock management interface in the variations table.
                </p>
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <span>Current Stock: {formData.stock_quantity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Keep availability toggle for editing */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <Label>Available for Purchase</Label>
              <p className="text-xs text-muted-foreground">
                Allow customers to buy this variation
              </p>
            </div>
            <Switch
              checked={formData.is_available}
              onCheckedChange={(c) => onChange("is_available", c)}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // For creating mode, show full inventory form
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="w-4 h-4" /> Inventory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="stock_quantity">
              Stock Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="stock_quantity"
              type="number"
              min="0"
              value={
                formData.stock_quantity === 0 ? "" : formData.stock_quantity
              }
              onChange={(e) => {
                const val = parseInt(e.target.value);
                onChange("stock_quantity", isNaN(val) ? 0 : val);
              }}
              className={`h-11 ${
                errors.stock_quantity ? "border-red-500" : ""
              }`}
              placeholder="0"
            />
            <ErrorMessage error={errors.stock_quantity} />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label>Available for Purchase</Label>
            <p className="text-xs text-muted-foreground">
              Allow customers to buy this variation
            </p>
          </div>
          <Switch
            checked={formData.is_available}
            onCheckedChange={(c) => onChange("is_available", c)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface AttributesProps {
  formData: VariationFormData;
  errors: Record<string, string>;
  attributeState: any;
}

export function AttributesSection({
  formData,
  errors,
  attributeState,
}: AttributesProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Hash className="w-4 h-4" /> Attributes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <ErrorMessage error={errors.attributes} />

        {/* Existing Tags */}
        {Object.entries(formData.attributes).length > 0 && (
          <div className="space-y-3">
            <Label>Current Attributes</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(formData.attributes).map(([key, value]) => (
                <Badge
                  key={key}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <span>
                    {key}: {value as string}
                  </span>
                  <button
                    type="button"
                    onClick={() => attributeState.remove(key)}
                    className="hover:bg-muted-foreground/20 rounded-full p-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Add New */}
        <div className="space-y-4 p-4 border border-dashed border-muted-foreground/20 rounded-lg">
          <Label>Add Attribute</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                placeholder="Key (e.g., Color)"
                value={attributeState.newKey}
                onChange={(e) => attributeState.setNewKey(e.target.value)}
                className={`h-11 ${
                  attributeState.errors.key ? "border-red-500" : ""
                }`}
              />
              <ErrorMessage error={attributeState.errors.key} />
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Value (e.g., Red)"
                value={attributeState.newValue}
                onChange={(e) => attributeState.setNewValue(e.target.value)}
                className={`h-11 ${
                  attributeState.errors.value ? "border-red-500" : ""
                }`}
              />
              <ErrorMessage error={attributeState.errors.value} />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={attributeState.add}
            disabled={!attributeState.newKey || !attributeState.newValue}
            className="w-full sm:w-auto h-10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Attribute
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Attributes help customers identify different variations (color, size,
          material, etc.)
        </p>
      </CardContent>
    </Card>
  );
}
