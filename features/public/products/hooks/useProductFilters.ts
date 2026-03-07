"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const STASHED_FILTERS_KEY = "products_stashed_filters";

type StashedFilters = {
  category?: string;
  min_price?: string;
  max_price?: string;
};

export type ProductFilters = {
  categoryId: string | undefined;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  search: string | undefined;
  isSearchActive: boolean;
};

export function useProductFilters(): ProductFilters & {
  setCategory: (id: string | undefined) => void;
  setPriceRange: (min: number | undefined, max: number | undefined) => void;
  clearFilters: () => void;
  setSearch: (query: string) => void;
  clearSearch: () => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoryId = searchParams.get("category") ?? undefined;
  const minPrice = searchParams.get("min_price")
    ? Number(searchParams.get("min_price"))
    : undefined;
  const maxPrice = searchParams.get("max_price")
    ? Number(searchParams.get("max_price"))
    : undefined;
  const search = searchParams.get("search") ?? undefined;
  const isSearchActive = !!search;

  const buildUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset page on filter change
      params.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      return `${pathname}?${params.toString()}`;
    },
    [searchParams, pathname],
  );

  const setCategory = useCallback(
    (id: string | undefined) => {
      router.push(buildUrl({ category: id }));
    },
    [router, buildUrl],
  );

  const setPriceRange = useCallback(
    (min: number | undefined, max: number | undefined) => {
      router.push(
        buildUrl({
          min_price: min !== undefined ? String(min) : undefined,
          max_price: max !== undefined ? String(max) : undefined,
        }),
      );
    },
    [router, buildUrl],
  );

  const clearFilters = useCallback(() => {
    router.push(
      buildUrl({
        category: undefined,
        min_price: undefined,
        max_price: undefined,
      }),
    );
  }, [router, buildUrl]);

  const setSearch = useCallback(
    (query: string) => {
      // Stash current filter params before clearing them
      const stash: StashedFilters = {
        category: searchParams.get("category") ?? undefined,
        min_price: searchParams.get("min_price") ?? undefined,
        max_price: searchParams.get("max_price") ?? undefined,
      };
      if (stash.category || stash.min_price || stash.max_price) {
        sessionStorage.setItem(STASHED_FILTERS_KEY, JSON.stringify(stash));
      }
      router.push(
        buildUrl({
          search: query,
          category: undefined,
          min_price: undefined,
          max_price: undefined,
        }),
      );
    },
    [router, buildUrl, searchParams],
  );

  const clearSearch = useCallback(() => {
    let stashed: StashedFilters = {};
    try {
      const raw = sessionStorage.getItem(STASHED_FILTERS_KEY);
      if (raw) {
        stashed = JSON.parse(raw) as StashedFilters;
        sessionStorage.removeItem(STASHED_FILTERS_KEY);
      }
    } catch {
      // ignore parse errors
    }
    router.push(
      buildUrl({
        search: undefined,
        category: stashed.category,
        min_price: stashed.min_price,
        max_price: stashed.max_price,
      }),
    );
  }, [router, buildUrl]);

  return {
    categoryId,
    minPrice,
    maxPrice,
    search,
    isSearchActive,
    setCategory,
    setPriceRange,
    clearFilters,
    setSearch,
    clearSearch,
  };
}
