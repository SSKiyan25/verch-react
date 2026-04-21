"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  OrgPromotionFilters,
  PromotionStatus,
  PromotionTriggerType,
} from "@/lib/types/org-promotions";

export function usePromotionFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<OrgPromotionFilters>({
    status: (searchParams.get("status") as PromotionStatus) || null,
    triggerType:
      (searchParams.get("triggerType") as PromotionTriggerType) || null,
    search: searchParams.get("search") || null,
  });

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  // Update URL when debounced search changes
  useEffect(() => {
    updateURL({ ...filters, search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.status, filters.triggerType]);

  const updateURL = useCallback(
    (newFilters: OrgPromotionFilters) => {
      const params = new URLSearchParams();

      if (newFilters.status) {
        params.set("status", newFilters.status);
      }

      if (newFilters.triggerType) {
        params.set("triggerType", newFilters.triggerType);
      }

      if (newFilters.search) {
        params.set("search", newFilters.search);
      }

      const queryString = params.toString();
      const newPath = queryString
        ? `?${queryString}`
        : window.location.pathname;

      router.push(newPath);
    },
    [router],
  );

  const setStatus = useCallback((status: PromotionStatus | null) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setTriggerType = useCallback(
    (triggerType: PromotionTriggerType | null) => {
      setFilters((prev) => ({ ...prev, triggerType }));
    },
    [],
  );

  const setSearch = useCallback((search: string | null) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      status: null,
      triggerType: null,
      search: null,
    });
    setDebouncedSearch(null);
    router.push(window.location.pathname);
  }, [router]);

  const hasActiveFilters =
    filters.status !== null ||
    filters.triggerType !== null ||
    (filters.search !== null &&
      filters.search !== undefined &&
      filters.search.trim() !== "");

  return {
    filters: {
      ...filters,
      search: debouncedSearch, // Use debounced value for actual filtering
    },
    setStatus,
    setTriggerType,
    setSearch,
    clearFilters,
    hasActiveFilters,
  };
}
