"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductOrderFilterValues = {
  date_from: string;
  date_to: string;
  search: string;
  status: string;
  variation_id: string;
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Manages product-order filter state via URL search params.
 *
 * Supports: date range, product search, status filter, variation filter.
 * All changes push to the router so server components re-fetch with new params.
 */
export function useProductOrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Read current filters from URL ──────────────────────────────────────────
  const filters: ProductOrderFilterValues = useMemo(
    () => ({
      date_from: searchParams.get("date_from") ?? "",
      date_to: searchParams.get("date_to") ?? "",
      search: searchParams.get("search") ?? "",
      status: searchParams.get("status") ?? "",
      variation_id: searchParams.get("variation_id") ?? "",
    }),
    [searchParams],
  );

  // ── Check if any filter is active ──────────────────────────────────────────
  const hasActiveFilters = useMemo(
    () =>
      filters.date_from !== "" ||
      filters.date_to !== "" ||
      filters.search !== "" ||
      filters.status !== "" ||
      filters.variation_id !== "",
    [filters],
  );

  // ── Build query string from filters ────────────────────────────────────────
  const buildQueryString = useCallback(
    (overrides: Partial<ProductOrderFilterValues> = {}): string => {
      const merged = { ...filters, ...overrides };

      // If variation_id changes without a search, keep search
      // If search changes, clear variation_id (different product context)
      const params = new URLSearchParams();

      if (merged.date_from) params.set("date_from", merged.date_from);
      if (merged.date_to) params.set("date_to", merged.date_to);
      if (merged.search) params.set("search", merged.search);
      if (merged.status) params.set("status", merged.status);
      if (merged.variation_id) params.set("variation_id", merged.variation_id);

      // Reset to page 1 when filters change
      params.delete("page");

      return params.toString();
    },
    [filters],
  );

  // ── Set a single filter value ──────────────────────────────────────────────
  const setFilter = useCallback(
    (key: keyof ProductOrderFilterValues, value: string) => {
      const qs = buildQueryString({ [key]: value || undefined });
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [buildQueryString, pathname, router],
  );

  // ── Set multiple filters at once ───────────────────────────────────────────
  const setFilters = useCallback(
    (updates: Partial<ProductOrderFilterValues>) => {
      const qs = buildQueryString(updates);
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [buildQueryString, pathname, router],
  );

  // ── Reset all filters ──────────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  // ── Check if a specific filter is active ───────────────────────────────────
  const isFilterActive = useCallback(
    (key: keyof ProductOrderFilterValues): boolean => {
      return filters[key] !== "";
    },
    [filters],
  );

  return {
    filters,
    hasActiveFilters,
    setFilter,
    setFilters,
    resetFilters,
    isFilterActive,
    buildQueryString,
  };
}
