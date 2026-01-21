"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ProductWithDetails,
  CreateProductData,
  CreateVariationData,
} from "@/lib/types/product";
import { useProductCreation } from "./useProductCreation";

interface UseProductFormProps {
  initialData?: ProductWithDetails;
}

export function useProductForm({ initialData }: UseProductFormProps = {}) {
  const params = useParams();
  const router = useRouter();
  const isEditing = Boolean(params?.id && params.id !== "new");

  const { createProduct, isCreating } = useProductCreation();

  // 1. We keep formData (this holds the paths: "temp/...")
  const [formData, setFormData] = useState<CreateProductData>({
    name: "",
    description: "",
    category_id: "",
    search_keywords: [],
    can_pre_order: false,
    discount_type: "none",
    discount_value: 0,
    status: "draft",
    temp_featured_image_path: "", // Initialize empty
    temp_gallery_image_paths: [], // Initialize empty
  });

  // REMOVED: const [featuredImage, setFeaturedImage]... (We don't need raw files anymore)
  // REMOVED: const [galleryImages, setGalleryImages]...

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description || "",
        category_id: initialData.category_id || "",
        search_keywords: initialData.search_keywords || [],
        can_pre_order: initialData.can_pre_order || false,
        discount_type: initialData.discount_type || "none",
        discount_target: initialData.discount_target || "",
        discount_value: initialData.discount_value || 0,
        status: initialData.status || "draft",
        // Note: We don't load temp paths for existing products,
        // usually we handle existing images separately, but for now this is fine.
      });
    }
  }, [isEditing, initialData]);

  const updateFormData = (updates: Partial<CreateProductData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // REMOVED: updateImages helper.
  // ProductMedia now calls updateFormData directly.

  const handleSave = async (currentVariations: CreateVariationData[] = []) => {
    try {
      if (isEditing) {
        console.log("Updating product:", formData);
        throw new Error("Update functionality not implemented yet");
      } else {
        // DEBUG LOG: Check this in your browser console before it sends!
        console.log("Submitting Payload:", {
          ...formData,
          variations: currentVariations,
        });

        // 2. CRITICAL CHANGE:
        // We only pass the data object. We do NOT pass file arguments anymore.
        const result = await createProduct({
          ...formData,
          variations: currentVariations,
        });

        if (result) {
          router.push(`/org/products`);
        }
      }
    } catch (error) {
      console.error("Error saving product:", error);
      throw error;
    }
  };

  const handleCancel = () => {
    router.push(`/org/products`);
  };

  return {
    isEditing,
    isSaving: isCreating,
    formData,
    updateFormData,
    handleSave,
    handleCancel,
  };
}
