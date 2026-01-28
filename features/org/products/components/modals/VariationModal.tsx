"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { ProductWithDetails, ProductVariation } from "@/lib/types/product";
import { VariationFormData } from "../../utils/variation-validation";

// Import Refactored Parts
import { useVariationForm } from "../../hooks/useVariationForm";
import {
  BasicInfoSection,
  PricingSection,
  InventorySection,
  AttributesSection,
} from "../variation-form-sections";

interface VariationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variation?: ProductVariation | null;
  product: ProductWithDetails;
  onSave: (data: VariationFormData) => Promise<void>;
  isLoading?: boolean;
}

export function VariationModal({
  open,
  onOpenChange,
  product,
  variation,
  onSave,
  isLoading = false,
}: VariationModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isEditing = !!variation;

  // Use the controller hook
  const {
    formData,
    validationErrors,
    attributeState,
    handleInputChange,
    handleSubmit,
  } = useVariationForm(open, variation, onSave);

  // Get existing variations from product - safely handle variations array
  const existingVariations = (product.variations ?? []).filter(
    (v) => v.id !== variation?.id // Exclude current variation when editing
  );

  // Get existing SKUs for duplicate checking
  const existingSkus = existingVariations
    .map((v) => v.sku)
    .filter(Boolean) as string[];

  // Get variation index for auto-generation
  const variationIndex = existingVariations.length;

  // FIX: Define title as a variable, not a component
  const title = isEditing ? "Edit Variation" : "Add New Variation";

  // Define the form content variable
  const formContent = (
    <div className="p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <BasicInfoSection
          formData={formData}
          errors={validationErrors}
          onChange={handleInputChange}
          product={product}
          existingSkus={existingSkus}
          variationIndex={variationIndex}
          existingVariations={existingVariations}
        />

        <PricingSection
          formData={formData}
          errors={validationErrors}
          onChange={handleInputChange}
          existingVariations={existingVariations}
        />

        <InventorySection
          formData={formData}
          errors={validationErrors}
          onChange={handleInputChange}
          existingVariations={existingVariations}
          isEditing={isEditing}
        />

        <AttributesSection
          formData={formData}
          errors={validationErrors}
          attributeState={attributeState}
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto order-2 sm:order-1 h-11"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-full sm:flex-1 order-1 sm:order-2 h-11"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? "Update Variation" : "Create Variation"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
        </SheetHeader>
        {formContent}
      </SheetContent>
    </Sheet>
  );
}

export type { VariationFormData };
