"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { ProductWithDetails, ProductFilters } from "@/lib/types/product";
import { toast } from "sonner";

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface UseProductsOptions {
  initialPage?: number;
  initialLimit?: number;
  autoFetch?: boolean;
}

export function useProducts(options: UseProductsOptions = {}) {
  const { user, loading: userLoading } = useUser();
  const organizationId = user?.organization_id;

  const { initialPage = 1, initialLimit = 20, autoFetch = true } = options;

  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState<ProductFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products from API
  const fetchProducts = async (
    currentFilters: ProductFilters = filters,
    currentPagination: Partial<PaginationInfo> = {}
  ) => {
    if (!organizationId) {
      setError("No organization found");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();

      // Pagination
      searchParams.append(
        "page",
        String(currentPagination.page || pagination.page)
      );
      searchParams.append(
        "limit",
        String(currentPagination.limit || pagination.limit)
      );

      // Filters
      if (currentFilters.status && currentFilters.status.length > 0) {
        searchParams.append("status", currentFilters.status[0]);
      }

      if (currentFilters.category_id) {
        searchParams.append("category_id", currentFilters.category_id);
      }

      if (currentFilters.search) {
        searchParams.append("search", currentFilters.search);
      }

      if (currentFilters.is_archived !== undefined) {
        searchParams.append("is_archived", String(currentFilters.is_archived));
      }

      const response = await fetch(
        `/api/organizations/${organizationId}/products?${searchParams.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch products");
      }

      const data = await response.json();

      setProducts(data.data || []);
      setPagination(
        data.pagination || {
          page: 1,
          limit: initialLimit,
          total: 0,
          pages: 0,
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch products";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Products fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update filters and refetch
  const updateFilters = (newFilters: ProductFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
    fetchProducts(newFilters, { page: 1 });
  };

  // Clear all filters
  const clearFilters = () => {
    updateFilters({});
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    const newPagination = { ...pagination, page };
    setPagination(newPagination);
    fetchProducts(filters, newPagination);
  };

  const nextPage = () => {
    if (pagination.page < pagination.pages) {
      goToPage(pagination.page + 1);
    }
  };

  const previousPage = () => {
    if (pagination.page > 1) {
      goToPage(pagination.page - 1);
    }
  };

  // Change page size
  const changePageSize = (limit: number) => {
    const newPagination = { ...pagination, limit, page: 1 };
    setPagination(newPagination);
    fetchProducts(filters, newPagination);
  };

  // Initial fetch - wait for user to load
  useEffect(() => {
    if (!userLoading && organizationId && autoFetch) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, autoFetch, userLoading]);

  // Search with debouncing
  useEffect(() => {
    if (!filters.search) return;

    const debounceTimer = setTimeout(() => {
      fetchProducts(filters, { page: 1 });
    }, 300);

    return () => clearTimeout(debounceTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const updateLocalProduct = (
    updatedProduct: Partial<ProductWithDetails> & { id: string }
  ) => {
    // console.log("Updating local product state:", updatedProduct);

    setProducts((currentProducts) => {
      return currentProducts.map((p) => {
        if (p.id === updatedProduct.id) {
          return {
            ...p, // Keep existing data
            ...updatedProduct, // Overwrite with new data

            // SECURITY: Ensure arrays/objects don't get wiped if undefined in update
            category: updatedProduct.category || p.category,
            variations: updatedProduct.variations || p.variations,

            // PHOTOS: Handle specific photo logic
            photo_urls: updatedProduct.photo_urls || p.photo_urls,

            // CRITICAL: Ensure the featured photo updates on the card immediately
            featured_photo_url:
              updatedProduct.featured_photo_url !== undefined
                ? updatedProduct.featured_photo_url
                : p.featured_photo_url,
          };
        }
        return p;
      });
    });
  };

  return {
    products,
    pagination,
    filters,
    isLoading: isLoading || userLoading,
    error,
    fetchProducts,
    updateFilters,
    clearFilters,
    updateLocalProduct,
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
    refresh: () => fetchProducts(),
  };
}
