"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, Package, Info, AlertCircle } from "lucide-react";
import { CreateVariationData } from "@/lib/types/product";
import { useValidation } from "@/lib/hooks/use-validation";
import {
  sanitizeInput,
  VALIDATION_PATTERNS,
} from "@/lib/hooks/use-input-validation";
import { toast } from "sonner";

interface ProductVariationsProps {
  variations: CreateVariationData[];
  onChange: (variations: CreateVariationData[]) => void;
}

interface VariationFormData extends Omit<CreateVariationData, "product_id"> {
  attributes: Record<string, string>;
}

export function ProductVariations({
  variations,
  onChange,
}: ProductVariationsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<VariationFormData>({
    sku: "",
    attributes: {},
    variation_name: "",
    price: 0,
    compare_at_price: 0,
    stock_quantity: 0,
  });

  // Validation rules for variation form
  const validationRules = {
    variation_name: {
      required: true,
      minLength: 2,
      maxLength: 100,
    },
    sku: {
      required: false,
      maxLength: 50,
      custom: (value: string) => {
        if (value && !VALIDATION_PATTERNS.sku.test(value)) {
          return "SKU can only contain letters, numbers, hyphens, and underscores";
        }
        return null;
      },
    },
    price: {
      required: true,
      min: 0.01,
      custom: (value: number) => {
        if (!value || value <= 0) return "Price must be greater than 0";
        if (value > 999999.99) return "Price too high";
        return null;
      },
    },
    compare_at_price: {
      required: false,
      min: 0,
      custom: (value: number) => {
        if (value && value > 999999.99) return "Price too high";
        if (value && formData.price && value <= formData.price) {
          return "Compare price should be higher than selling price";
        }
        return null;
      },
    },
    stock_quantity: {
      required: false,
      min: 0,
      custom: (value: number) => {
        if (value < 0) return "Stock cannot be negative";
        if (value > 999999) return "Stock quantity too high";
        return null;
      },
    },
    attributes: {
      required: false,
    },
  };

  const { errors, validateAll, validateSingle, clearAllErrors } = useValidation(
    formData,
    validationRules
  );

  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");

  const resetForm = () => {
    setFormData({
      sku: "",
      attributes: {},
      variation_name: "",
      price: 0,
      compare_at_price: 0,
      stock_quantity: 0,
    });
    setEditingIndex(null);
    clearAllErrors();
    setNewAttrKey("");
    setNewAttrValue("");
  };

  const handleAdd = () => {
    setIsDialogOpen(true);
    resetForm();
  };

  const handleEdit = (index: number) => {
    const variation = variations[index];
    setFormData({
      sku: variation.sku || "",
      attributes: variation.attributes || {},
      variation_name: variation.variation_name || "",
      price: variation.price,
      compare_at_price: variation.compare_at_price || 0,
      stock_quantity: variation.stock_quantity || 0,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
    clearAllErrors();
  };

  const handleSave = () => {
    if (!validateAll(formData)) {
      toast.error("Please fix validation errors before saving");
      return;
    }

    // Check for duplicate SKUs
    if (formData.sku) {
      const isDuplicate = variations.some(
        (v, index) => v.sku === formData.sku && index !== editingIndex
      );
      if (isDuplicate) {
        toast.error("SKU already exists in another variation");
        return;
      }
    }

    const newVariation: CreateVariationData = {
      ...formData,
      product_id: "", // Will be set when product is created
    };

    if (editingIndex !== null) {
      const updatedVariations = [...variations];
      updatedVariations[editingIndex] = newVariation;
      onChange(updatedVariations);
      toast.success("Variation updated successfully");
    } else {
      onChange([...variations, newVariation]);
      toast.success("Variation added successfully");
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (index: number) => {
    const updatedVariations = variations.filter((_, i) => i !== index);
    onChange(updatedVariations);
    toast.success("Variation removed");
  };

  const addAttribute = (key: string, value: string) => {
    if (key.trim() && value.trim()) {
      const sanitizedKey = sanitizeInput.text(key.trim());
      const sanitizedValue = sanitizeInput.text(value.trim());

      if (sanitizedKey.length > 50) {
        toast.error("Attribute key too long (max 50 characters)");
        return;
      }

      if (sanitizedValue.length > 100) {
        toast.error("Attribute value too long (max 100 characters)");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        attributes: { ...prev.attributes, [sanitizedKey]: sanitizedValue },
      }));
      setNewAttrKey("");
      setNewAttrValue("");
    }
  };

  const removeAttribute = (key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [key]: removed, ...rest } = formData.attributes;
    setFormData((prev) => ({ ...prev, attributes: rest }));
  };

  const handleAddAttribute = () => {
    addAttribute(newAttrKey, newAttrValue);
  };

  const handleFormFieldChange = (
    field: keyof VariationFormData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
  ) => {
    let processedValue = value;

    // Sanitize based on field type
    if (field === "variation_name") {
      processedValue = sanitizeInput.text(value);
    } else if (field === "sku") {
      processedValue = sanitizeInput.sku(value);
    } else if (field === "price" || field === "compare_at_price") {
      processedValue = sanitizeInput.price(value.toString());
    } else if (field === "stock_quantity") {
      processedValue = sanitizeInput.number(value.toString());
      processedValue = Math.max(0, Math.floor(processedValue)); // Ensure positive integer
    }

    setFormData((prev) => ({ ...prev, [field]: processedValue }));
    validateSingle(field, processedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent, field?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (field === "attribute") {
        handleAddAttribute();
      }
    }
  };

  // Calculate commission preview (placeholder for now)
  const calculateFinalPrice = (price: number) => {
    const commissionRate = 0.05; // 5% placeholder
    return price * (1 + commissionRate);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Product Variations
          </CardTitle>
          <Button onClick={handleAdd} size="sm">
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
            own price, SKU, and stock quantity. At least one variation is
            required.
          </AlertDescription>
        </Alert>

        {variations.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No variations yet</h3>
            <p className="text-muted-foreground mb-4">
              Add variations like size, color, or other options for your
              product. You need at least one variation to sell your product.
            </p>
            <Button onClick={handleAdd} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add First Variation
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {variations.map((variation, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium">
                      {variation.variation_name || `Variation ${index + 1}`}
                    </h4>
                    {variation.sku && (
                      <Badge variant="outline" className="text-xs">
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
                              variant="secondary"
                              className="text-xs"
                            >
                              {key}: {value}
                            </Badge>
                          )
                        )}
                      </div>
                    )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div>Your Price: ₱{variation.price.toFixed(2)}</div>
                    <div>
                      Final Price: ₱
                      {calculateFinalPrice(variation.price).toFixed(2)}
                    </div>
                    {variation.compare_at_price &&
                      variation.compare_at_price > 0 && (
                        <div>
                          Compare At: ₱{variation.compare_at_price.toFixed(2)}
                        </div>
                      )}
                    <div>Stock: {variation.stock_quantity || 0}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Variation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      • <strong>Your Price:</strong> The amount you&apos;ll
                      receive per sale
                    </li>
                    <li>
                      • <strong>Compare At Price:</strong> Show customers the
                      original/MSRP price (optional)
                    </li>
                    <li>
                      • <strong>Final Price:</strong> What customers pay (your
                      price + platform commission)
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      handleFormFieldChange("variation_name", e.target.value)
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

                <div className="space-y-2">
                  <Label htmlFor="sku">
                    SKU (Optional)
                    {errors.sku && (
                      <span className="text-xs text-red-500 ml-2">
                        ({errors.sku})
                      </span>
                    )}
                  </Label>
                  <Input
                    id="sku"
                    placeholder="e.g., PROD-RED-L"
                    value={formData.sku}
                    onChange={(e) =>
                      handleFormFieldChange("sku", e.target.value)
                    }
                    className={errors.sku ? "border-red-500" : ""}
                    maxLength={50}
                  />
                  {errors.sku && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="w-3 h-3" />
                      {errors.sku}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Stock Keeping Unit for inventory tracking
                  </p>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    onChange={(e) =>
                      handleFormFieldChange("price", e.target.value)
                    }
                    className={errors.price ? "border-red-500" : ""}
                  />
                  {errors.price && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="w-3 h-3" />
                      {errors.price}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Amount you&apos;ll receive per sale
                  </p>
                  {formData.price > 0 && (
                    <p className="text-xs text-green-600">
                      Customer pays: ₱
                      {calculateFinalPrice(formData.price).toFixed(2)} (includes
                      commission)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compare-price">
                    Compare At Price (₱)
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
                      handleFormFieldChange("compare_at_price", e.target.value)
                    }
                    className={errors.compare_at_price ? "border-red-500" : ""}
                  />
                  {errors.compare_at_price && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="w-3 h-3" />
                      {errors.compare_at_price}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Original/MSRP price to show savings (optional)
                  </p>
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
                    handleFormFieldChange("stock_quantity", e.target.value)
                  }
                  className={errors.stock_quantity ? "border-red-500" : ""}
                />
                {errors.stock_quantity && (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="w-3 h-3" />
                    {errors.stock_quantity}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  How many units do you have available for sale?
                </p>
              </div>

              {/* Attributes */}
              <div className="space-y-4">
                <div>
                  <Label>Attributes (Size, Color, etc.)</Label>
                  <p className="text-xs text-muted-foreground">
                    Add properties that make this variation unique from others
                  </p>
                </div>

                {/* Existing Attributes */}
                {Object.keys(formData.attributes).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(formData.attributes).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 p-2 bg-muted rounded"
                      >
                        <span className="text-sm font-medium">{key}:</span>
                        <span className="text-sm">{value}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttribute(key)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Attribute */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Property (e.g., Size, Color)"
                    value={newAttrKey}
                    onChange={(e) =>
                      setNewAttrKey(sanitizeInput.text(e.target.value))
                    }
                    onKeyDown={(e) => handleKeyDown(e, "attribute")}
                    className="flex-1"
                    maxLength={50}
                  />
                  <Input
                    placeholder="Value (e.g., Large, Red)"
                    value={newAttrValue}
                    onChange={(e) =>
                      setNewAttrValue(sanitizeInput.text(e.target.value))
                    }
                    onKeyDown={(e) => handleKeyDown(e, "attribute")}
                    className="flex-1"
                    maxLength={100}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddAttribute}
                    disabled={!newAttrKey.trim() || !newAttrValue.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
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
      </CardContent>
    </Card>
  );
}
