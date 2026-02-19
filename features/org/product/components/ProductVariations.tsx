/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, Package, Info, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateVariationData } from "@/lib/types/product";
import { useProductVariations } from "../hooks/useProductVariations";
import { VariationModal } from "./VariationModal";
import { Organization } from "@/lib/types/organization";

interface ProductVariationsProps {
  variations: CreateVariationData[];
  onChange: (variations: CreateVariationData[]) => void;
  productName?: string;
  // 1. Add organization prop
  organization: Organization | null;
}

export function ProductVariations({
  variations,
  onChange,
  productName = "Product",
  organization, // 2. Destructure organization
}: ProductVariationsProps) {
  const {
    isDialogOpen,
    setIsDialogOpen,
    editingIndex,
    formData,
    newAttrKey,
    setNewAttrKey,
    newAttrValue,
    setNewAttrValue,
    errors,
    commissionRate,
    handleAdd,
    handleEdit,
    handleSave,
    handleDelete,
    handleGenerateSku,
    handleAddAttribute,
    handleFormFieldChange,
    handleKeyDown,
    removeAttribute,
    calculateFinalPrice,
  } = useProductVariations(variations, onChange, productName, organization); // 3. Pass to hook

  // Create a wrapper function to bridge the type gap
  const handleFormFieldChangeWrapper = (field: string, value: any) => {
    // Cast field to keyof VariationFormData since we know these are the only valid fields
    const validFields = [
      "sku",
      "variation_name",
      "price",
      "compare_at_price",
      "stock_quantity",
      "attributes",
    ] as const;
    if (validFields.includes(field as any)) {
      handleFormFieldChange(field as any, value);
    }
  };

  // Transform formData to ensure all fields are non-null for the modal
  const transformedFormData = {
    sku: formData.sku || "",
    attributes: formData.attributes || {},
    variation_name: formData.variation_name || "",
    price: formData.price || 0,
    compare_at_price: formData.compare_at_price || 0,
    stock_quantity: formData.stock_quantity || 0,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Product Variations
            <Badge variant="outline" className="ml-2">
              {variations.length}
            </Badge>
          </CardTitle>
          <Button onClick={handleAdd} size="sm" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Variation
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Information Alert */}
        <Alert className="mb-6">
          <Info className="w-4 h-4" />
          <AlertDescription>
            <strong>About Variations:</strong> Create different options for your
            product like sizes, colors, or styles. Each variation can have its
            own price, SKU, and stock quantity.
          </AlertDescription>
        </Alert>

        {variations.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No variations yet</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Add variations like size, color, or other options for your
              product. You need at least one variation to sell your product.
            </p>
            <Button
              onClick={handleAdd}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Variation
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {variations.map((variation, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                {/* Header - Variation Name and Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h4 className="font-medium truncate">
                        {variation.variation_name || `Variation ${index + 1}`}
                      </h4>
                      {variation.sku && (
                        <Badge variant="outline" className="text-xs w-fit">
                          SKU: {variation.sku}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Desktop Actions */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(index)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Mobile Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild className="sm:hidden">
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(index)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Attributes */}
                {variation.attributes &&
                  Object.keys(variation.attributes).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(variation.attributes).map(
                        ([key, value]) => (
                          <Badge
                            key={key}
                            variant="secondary"
                            className="text-xs"
                          >
                            {key}: {value}
                          </Badge>
                        )
                      )}
                    </div>
                  )}

                {/* Pricing Info - Responsive Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm bg-muted/50 p-3 rounded">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Your Price
                    </div>
                    <div className="font-medium">
                      ₱{variation.price.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Final Price
                    </div>
                    <div className="font-medium text-green-600">
                      ₱{calculateFinalPrice(variation.price).toFixed(2)}
                    </div>
                  </div>
                  {variation.compare_at_price &&
                    variation.compare_at_price > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          Compare At
                        </div>
                        <div className="font-medium justify-center">
                          ₱{variation.compare_at_price.toFixed(2)}
                        </div>
                      </div>
                    )}
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Stock</div>
                    <div className="font-medium">
                      {variation.stock_quantity || 0}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        <VariationModal
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          editingIndex={editingIndex}
          formData={transformedFormData}
          errors={errors}
          commissionRate={commissionRate}
          newAttrKey={newAttrKey}
          setNewAttrKey={setNewAttrKey}
          newAttrValue={newAttrValue}
          setNewAttrValue={setNewAttrValue}
          onSave={handleSave}
          onGenerateSku={handleGenerateSku}
          onFormFieldChange={handleFormFieldChangeWrapper}
          onKeyDown={handleKeyDown}
          onAddAttribute={handleAddAttribute}
          onRemoveAttribute={removeAttribute}
          calculateFinalPrice={calculateFinalPrice}
        />
      </CardContent>
    </Card>
  );
}
