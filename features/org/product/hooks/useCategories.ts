"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ProductCategory } from "@/lib/types/product";
import { toast } from "sonner";

export interface CreateCategoryData {
  name: string;
  description?: string;
  parent_id?: string;
  sort_order?: number;
  icon?: string;
}

export function useCategories() {
  const params = useParams();
  //   const pathname = usePathname();

  // More flexible organization ID extraction
  const organizationId = params.id || params.orgId || "global";

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories - now globally accessible
  const fetchCategories = async (includeInactive = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();
      if (includeInactive) {
        searchParams.append("include_inactive", "true");
      }

      // Use global categories endpoint or try with organization
      const url = `/api/categories?${searchParams.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch categories");
      }

      const data = await response.json();

      setCategories(data.data || []);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch categories";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new category
  const createCategory = async (
    categoryData: CreateCategoryData
  ): Promise<ProductCategory | null> => {
    try {
      setIsCreating(true);
      setError(null);

      // Use global endpoint or organization-specific if we have an orgId
      const url =
        organizationId && organizationId !== "global"
          ? `/api/organizations/${organizationId}/products/categories`
          : `/api/categories`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create category");
      }

      const data = await response.json();
      const newCategory = data.data;

      // Add the new category to the list
      setCategories((prev) => [...prev, newCategory]);

      toast.success(data.message || "Category created successfully");
      return newCategory;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create category";
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  // Initial fetch - always fetch categories regardless of organizationId
  useEffect(() => {
    fetchCategories();
  }, []); // No dependencies - fetch once on mount

  // Get active categories only
  const activeCategories = categories.filter((cat) => cat.is_active);

  // Get root categories (no parent)
  const rootCategories = activeCategories.filter((cat) => !cat.parent_id);

  // Get categories by parent
  const getCategoriesByParent = (parentId: string) => {
    return activeCategories.filter((cat) => cat.parent_id === parentId);
  };

  // Find category by ID
  const findCategoryById = (id: string) => {
    return categories.find((cat) => cat.id === id);
  };

  return {
    categories: activeCategories,
    allCategories: categories,
    rootCategories,
    isLoading,
    isCreating,
    error,
    fetchCategories,
    createCategory,
    getCategoriesByParent,
    findCategoryById,
    refresh: () => fetchCategories(),
  };
}
