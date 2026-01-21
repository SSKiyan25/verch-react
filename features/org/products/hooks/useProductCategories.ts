"use client";

import { useState, useEffect } from "react";
import { ProductCategory } from "@/lib/types/product";

export function useProductCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories from global endpoint
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/categories`);

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
      console.error("Categories fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchCategories();
  }, []);

  // Get active categories only
  const activeCategories = categories.filter((cat) => cat.is_active);

  // Find category by ID
  const findCategoryById = (id: string) => {
    return categories.find((cat) => cat.id === id);
  };

  return {
    categories: activeCategories,
    allCategories: categories,
    isLoading,
    error,
    fetchCategories,
    findCategoryById,
    refresh: () => fetchCategories(),
  };
}
