"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface UseOrdersPaginationProps {
  currentPage: number;
  currentStatus: string | undefined;
  totalCount: number;
  pageSize: number;
}

interface UseOrdersPaginationReturn {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  goToStatus: (status: string | undefined) => void;
}

export function useOrdersPagination({
  currentPage,
  currentStatus,
  totalCount,
  pageSize,
}: UseOrdersPaginationProps): UseOrdersPaginationReturn {
  const router = useRouter();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const buildUrl = useCallback(
    (page: number, status: string | undefined): string => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (page > 1) params.set("page", String(page));
      const query = params.toString();
      return `/user/orders${query ? `?${query}` : ""}`;
    },
    [],
  );

  const goToNextPage = useCallback(() => {
    if (!hasNextPage) return;
    router.push(buildUrl(currentPage + 1, currentStatus));
  }, [router, buildUrl, currentPage, currentStatus, hasNextPage]);

  const goToPrevPage = useCallback(() => {
    if (!hasPrevPage) return;
    router.push(buildUrl(currentPage - 1, currentStatus));
  }, [router, buildUrl, currentPage, currentStatus, hasPrevPage]);

  const goToStatus = useCallback(
    (status: string | undefined) => {
      // Reset to page 1 when changing status
      router.push(buildUrl(1, status));
    },
    [router, buildUrl],
  );

  return {
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToNextPage,
    goToPrevPage,
    goToStatus,
  };
}
