"use client";

import { useState, useEffect } from "react";
import { ProductWithDetails, ProductFilters } from "@/lib/types/product";
import { toast } from "sonner";
import { getCachedUserOrganization } from "@/app/actions/auth";

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
  const { initialPage = 1, initialLimit = 10, autoFetch = true } = options;

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
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

  // 👇 Fetch Org ID via Server Action
  useEffect(() => {
    const fetchOrgId = async () => {
      try {
        // console.log("[useProducts] 🔍 Fetching cached organization ID...");
        setIsLoadingUser(true);

        // 👇 Call Server Action
        // ✅ Leverages Next.js Data Cache, saving DB reads
        const cachedOrgId = await getCachedUserOrganization();

        if (cachedOrgId) {
          // console.log("[useProducts] ✅ Found Org ID:", cachedOrgId);
          setOrganizationId(cachedOrgId);
        } else {
          console.log("[useProducts] ⚠️ No Organization ID found.");
          setOrganizationId(null);
        }
      } catch (error) {
        console.error("[useProducts] ❌ Error fetching org:", error);
        setOrganizationId(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchOrgId();
  }, []);

  // Fetch products from API
  const fetchProducts = async (
    currentFilters: ProductFilters = filters,
    currentPagination: Partial<PaginationInfo> = {},
  ) => {
    if (!organizationId) {
      console.log("[useProducts] ⏸️ Skipping fetch - no organization_id");
      setError("No organization found");
      return;
    }

    try {
      // console.log(
      //   "[useProducts] 📦 Fetching products for organization:",
      //   organizationId
      // );
      setIsLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();

      // Pagination
      searchParams.append(
        "page",
        String(currentPagination.page || pagination.page),
      );
      searchParams.append(
        "limit",
        String(currentPagination.limit || pagination.limit),
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

      // console.log(
      //   "[useProducts] 🔗 API URL:",
      //   `/api/organizations/${organizationId}/products?${searchParams.toString()}`
      // );

      const response = await fetch(
        `/api/organizations/${organizationId}/products?${searchParams.toString()}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch products");
      }

      const data = await response.json();

      console.log("[useProducts] ✅ Products fetched successfully:", {
        count: data.data?.length || 0,
        total: data.pagination?.total || 0,
        page: data.pagination?.page || 1,
      });

      setProducts(data.data || []);
      setPagination(
        data.pagination || {
          page: 1,
          limit: initialLimit,
          total: 0,
          pages: 0,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch products";
      console.error("[useProducts] ❌ Fetch error:", error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Update filters and refetch
  const updateFilters = (newFilters: ProductFilters) => {
    console.log("[useProducts] 🔄 Updating filters:", newFilters);
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
    fetchProducts(newFilters, { page: 1 });
  };

  // Clear all filters
  const clearFilters = () => {
    console.log("[useProducts] 🧹 Clearing all filters");
    updateFilters({});
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    console.log("[useProducts] 📄 Going to page:", page);
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
    console.log("[useProducts] 📏 Changing page size to:", limit);
    const newPagination = { ...pagination, limit, page: 1 };
    setPagination(newPagination);
    fetchProducts(filters, newPagination);
  };

  // 👇 Initial fetch triggers once we have the ID
  useEffect(() => {
    if (!isLoadingUser && organizationId && autoFetch) {
      console.log("[useProducts] 🚀 Initial fetch triggered");
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, autoFetch, isLoadingUser]);

  // Search with debouncing
  useEffect(() => {
    if (!filters.search) return;

    console.log("[useProducts] 🔍 Search debouncing for:", filters.search);
    const debounceTimer = setTimeout(() => {
      fetchProducts(filters, { page: 1 });
    }, 300);

    return () => clearTimeout(debounceTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const updateLocalProduct = (
    updatedProduct: Partial<ProductWithDetails> & { id: string },
  ) => {
    console.log("[useProducts] 🔄 Updating local product:", {
      productId: updatedProduct.id,
      updatedFields: Object.keys(updatedProduct),
    });

    setProducts((currentProducts) => {
      const updatedProducts = currentProducts.map((p) => {
        if (p.id === updatedProduct.id) {
          const merged = {
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

          console.log("[useProducts] ✅ Product updated locally:", {
            before: { status: p.status, is_approved: p.is_approved },
            after: { status: merged.status, is_approved: merged.is_approved },
          });

          return merged;
        }
        return p;
      });

      return updatedProducts;
    });
  };

  return {
    products,
    pagination,
    filters,
    isLoading: isLoading || isLoadingUser, // 👈 Combine loading states
    error,
    fetchProducts,
    updateFilters,
    clearFilters,
    updateLocalProduct,
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
    refresh: () => {
      console.log("[useProducts] 🔄 Manual refresh triggered");
      fetchProducts();
    },
  };
}
