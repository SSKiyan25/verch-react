"use client";

import { useState } from "react";
import { ProductWithDetails, CreateVariationData } from "@/lib/types/product";
import { useProductForm } from "../hooks/useProductForm";
import { ProductFormHeader } from "./ProductFormHeader";
import { ProductBasicInfo } from "./ProductBasicInfo";
import { ProductMedia } from "./ProductMedia";
import { ProductVariations } from "./ProductVariations";
import { ProductSettings } from "./ProductSettings";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

interface ProductFormProps {
  initialData?: ProductWithDetails;
}

export function ProductForm({ initialData }: ProductFormProps) {
  const {
    isEditing,
    isSaving,
    formData,
    updateFormData,
    handleSave,
    handleCancel,
  } = useProductForm({ initialData });

  const [variations, setVariations] = useState<CreateVariationData[]>([]);

  const handleSaveWithVariations = async () => {
    const productData = {
      ...formData,
      variations,
    };

    console.log("Saving product with variations:", productData);
    await handleSave();
  };

  return (
    <div className="min-h-screen bg-background">
      <ProductFormHeader
        isEditing={isEditing}
        productName={initialData?.name}
        isSaving={isSaving}
        onSave={handleSaveWithVariations}
        onCancel={handleCancel}
      />

      <div className="container max-w-3xl mx-auto p-4">
        {/* Linear Top-to-Bottom Layout */}
        <div className="space-y-8">
          {/* Step 1: Basic Information */}
          <ProductBasicInfo data={formData} onChange={updateFormData} />

          {/* Step 2: Media/Images */}
          <ProductMedia data={formData} onChange={updateFormData} />

          {/* Step 3: Product Variations */}
          <ProductVariations variations={variations} onChange={setVariations} />

          {/* Step 4: Settings & Visibility */}
          <ProductSettings data={formData} onChange={updateFormData} />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            className="min-w-[100px]"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSaveWithVariations}
            disabled={
              isSaving || !formData.name?.trim() || variations.length === 0
            }
            className="min-w-[120px]"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving
              ? "Saving..."
              : isEditing
              ? "Update Product"
              : "Create Product"}
          </Button>
        </div>
      </div>
    </div>
  );
}
