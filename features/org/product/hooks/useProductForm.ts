"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ProductWithDetails,
  CreateProductData,
  UpdateProductData,
} from "@/lib/types/product";

interface UseProductFormProps {
  initialData?: ProductWithDetails;
}

export function useProductForm({ initialData }: UseProductFormProps = {}) {
  const router = useRouter();
  const params = useParams();
  const isEditing = Boolean(params?.id && params.id !== "new");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<CreateProductData>({
    name: "",
    description: "",
    category_id: "",
    search_keywords: [],
    featured_photo_url: "",
    photo_urls: [],
    can_pre_order: false,
    discount_type: "none",
    discount_value: 0,
  });

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description || "",
        category_id: initialData.category_id || "",
        search_keywords: initialData.search_keywords || [],
        featured_photo_url: initialData.featured_photo_url || "",
        photo_urls: initialData.photo_urls || [],
        can_pre_order: initialData.can_pre_order || false,
        discount_type: initialData.discount_type || "none",
        discount_target: initialData.discount_target || "",
        discount_value: initialData.discount_value || 0,
      });
    }
  }, [isEditing, initialData]);

  const updateFormData = (updates: Partial<CreateProductData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Implement save logic here
      if (isEditing) {
        // Update product
        console.log("Updating product:", formData);
      } else {
        // Create product
        console.log("Creating product:", formData);
      }

      // Redirect after successful save
      router.push("/org/products");
    } catch (error) {
      console.error("Error saving product:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return {
    isEditing,
    isLoading,
    isSaving,
    formData,
    updateFormData,
    handleSave,
    handleCancel,
  };
}
