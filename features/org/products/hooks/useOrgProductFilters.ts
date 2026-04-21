"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type {
  OrgProductFilters,
  ProductStatus,
} from "@/lib/types/org-products";

type UseOrgProductFiltersReturn = {
  currentFilters: OrgProductFilters;
  currentPage: number;
  currentLimit: number;
  setStatus: (status: ProductStatus | undefined) => void;
  setCategory: (categoryId: string | undefined) => void;
  setSearch: (search: string) => void;
  setIsArchived: (isArchived: boolean) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  isPending: boolean;
};

export function useOrgProductFilters(): UseOrgProductFiltersReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read current filters from URL
  const currentFilters: OrgProductFilters = {
    status: (searchParams.get("status") as ProductStatus) || undefined,
    categoryId: searchParams.get("category") || undefined,
    search: searchParams.get("search") || undefined,
    isArchived: searchParams.get("archived") === "true",
  };

  const currentPage = Math.max(1, Number(searchParams.get("page") || 1));
  const currentLimit = Number(searchParams.get("limit") || 12);

  const setStatus = useCallback(
    (status: ProductStatus | undefined) => {
      const params = new URLSearchParams(searchParams.toString());

      if (status) {
        params.set("status", status);
      } else {
        params.delete("status");
      }

      // Reset to page 1 when filter changes
      params.delete("page");

      startTransition(() => {
        router.replace(`/org/products?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const setCategory = useCallback(
    (categoryId: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());

      if (categoryId) {
        params.set("category", categoryId);
      } else {
        params.delete("category");
      }

      // Reset to page 1 when filter changes
      params.delete("page");

      startTransition(() => {
        router.replace(`/org/products?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const setSearch = useCallback(
    (search: string) => {
      const params = new URLSearchParams(searchParams.toString());

      const trimmed = search?.trim();
      if (trimmed) {
        params.set("search", trimmed);
      } else {
        params.delete("search");
      }

      // Reset to page 1 when filter changes
      params.delete("page");

      startTransition(() => {
        router.replace(`/org/products?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const setIsArchived = useCallback(
    (isArchived: boolean) => {
      const params = new URLSearchParams(searchParams.toString());

      if (isArchived) {
        params.set("archived", "true");
      } else {
        params.delete("archived");
      }

      // Reset to page 1 when filter changes
      params.delete("page");

      startTransition(() => {
        router.replace(`/org/products?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const setPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());

      if (page > 1) {
        params.set("page", String(page));
      } else {
        params.delete("page");
      }

      startTransition(() => {
        router.replace(`/org/products?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const resetFilters = useCallback(() => {
    startTransition(() => {
      router.replace("/org/products");
    });
  }, [router]);

  return {
    currentFilters,
    currentPage,
    currentLimit,
    setStatus,
    setCategory,
    setSearch,
    setIsArchived,
    setPage,
    resetFilters,
    isPending,
  };
}
