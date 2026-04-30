"use client";

import { useState } from "react";
import { CreateVariationData } from "@/lib/types/product";
import { useValidation } from "@/lib/hooks/use-validation";
import {
  sanitizeInput,
  VALIDATION_PATTERNS,
} from "@/lib/hooks/use-input-validation";
import { generateSku, validateSku } from "@/lib/utils/sku-generator";
import { toast } from "sonner";

interface VariationFormData extends Omit<CreateVariationData, "product_id"> {
  attributes: Record<string, string>;
}

export function useProductVariations(
  variations: CreateVariationData[],
  onChange: (variations: CreateVariationData[]) => void,
  productName: string = "Product",
  commissionRate: number = 0,
) {
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
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");

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
    validationRules,
  );

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

  // Helper to pre-fill variation name when user clicks existing variation
  const handleVariationClick = (variation: CreateVariationData) => {
    // Pre-fill with existing name and price to help user differentiate
    setFormData((prev) => ({
      ...prev,
      variation_name: variation.variation_name || "",
      price: variation.price,
    }));
    toast.info("Variation pre-filled", {
      description: "Modify the name, price, or attributes to create a different variation",
    });
  };

  const handleGenerateSku = () => {
    if (!formData.variation_name || formData.variation_name.trim().length < 2) {
      toast.error("Please enter a variation name first");
      return;
    }

    const existingSkus = variations
      .map((v) => v.sku)
      .filter((sku): sku is string => Boolean(sku));

    const generatedSku = generateSku({
      productName: productName || "Product",
      variationName: formData.variation_name,
      variationIndex: editingIndex !== null ? editingIndex : variations.length,
      existingSkus,
    });

    const validation = validateSku(generatedSku);
    if (!validation.isValid) {
      toast.error(`Generated SKU has issues: ${validation.issues.join(", ")}`);
      return;
    }

    setFormData((prev) => ({ ...prev, sku: generatedSku }));
    validateSingle("sku", generatedSku);
    toast.success("SKU generated successfully!");
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
      compare_at_price: 0,
      stock_quantity: variation.stock_quantity || 0,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
    clearAllErrors();
  };

  // Helper function to compare attributes
  const areAttributesEqual = (
    attrs1: Record<string, string>,
    attrs2: Record<string, string>,
  ): boolean => {
    const keys1 = Object.keys(attrs1).sort();
    const keys2 = Object.keys(attrs2).sort();

    if (keys1.length !== keys2.length) return false;

    return keys1.every((key) => attrs1[key] === attrs2[key]);
  };

  const handleSave = () => {
    if (!validateAll(formData)) {
      toast.error("Please fix validation errors before saving");
      return;
    }

    // Check for duplicate SKU
    if (formData.sku) {
      const isDuplicate = variations.some(
        (v, index) => v.sku === formData.sku && index !== editingIndex,
      );
      if (isDuplicate) {
        toast.error("SKU already exists in another variation");
        return;
      }
    }

    // Check for duplicate variation name with same attributes
    const duplicateVariation = variations.find(
      (v, index) =>
        v.variation_name === formData.variation_name &&
        index !== editingIndex,
    );

    if (duplicateVariation) {
      // Compare attributes
      const existingAttrs = duplicateVariation.attributes || {};
      const newAttrs = formData.attributes || {};

      if (areAttributesEqual(existingAttrs, newAttrs)) {
        toast.error(
          "A variation with this name and attributes already exists",
          {
            description: "Please use a different name or change the attributes",
          },
        );
        return;
      }
    }

    const newVariation: CreateVariationData = {
      ...formData,
      product_id: "",
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
    value: any,
  ) => {
    let processedValue = value;

    if (field === "variation_name") {
      processedValue = sanitizeInput.text(value);
    } else if (field === "sku") {
      processedValue = sanitizeInput.sku(value);
    } else if (field === "price") {
      processedValue = sanitizeInput.price(value.toString());
    } else if (field === "stock_quantity") {
      processedValue = sanitizeInput.number(value.toString());
      processedValue = Math.max(0, Math.floor(processedValue));
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

  const calculateFinalPrice = (price: number) => {
    return price * (1 + commissionRate / 100);
  };

  return {
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
    addAttribute,
    removeAttribute,
    calculateFinalPrice,
    handleVariationClick,
  };
}
