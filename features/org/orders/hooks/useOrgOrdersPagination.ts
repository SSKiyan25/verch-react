"use client";

import { useMemo } from "react";

type UsePaginationProps = {
  totalCount: number;
  currentPage: number;
  pageSize: number;
};

export function useOrgOrdersPagination({
  totalCount,
  currentPage,
  pageSize,
}: UsePaginationProps) {
  return useMemo(() => {
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;
    const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endItem = Math.min(currentPage * pageSize, totalCount);

    return { totalPages, hasPrev, hasNext, startItem, endItem, totalCount };
  }, [totalCount, currentPage, pageSize]);
}
