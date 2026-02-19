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
  // 1. Add orgId to props so we can pass it down
  orgId: string;
}

export function useProductForm({ initialData, orgId }: UseProductFormProps) {
  const params = useParams();
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isEditing = Boolean(params?.id && (params.id as any) !== "new");

  // 2. Pass orgId to the creation hook
  const { createProduct, isCreating } = useProductCreation(orgId);

  // 3. We keep formData (this holds the paths: "temp/...")
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
      });
    }
  }, [isEditing, initialData]);

  const updateFormData = (updates: Partial<CreateProductData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async (currentVariations: CreateVariationData[] = []) => {
    try {
      if (isEditing) {
        console.log("Updating product:", formData);
        throw new Error("Update functionality not implemented yet");
      } else {
        // // DEBUG LOG: Check this in your browser console before it sends!
        // console.log("Submitting Payload:", {
        //   ...formData,
        //   variations: currentVariations,
        // });

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
