"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useProductPagination } from "../hooks/useProductPagination";

type Props = {
  totalPages: number;
  currentPage?: number; // optional: SSR hint, actual state derived from URL
};

function buildPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [];
  const delta = 1; // pages on each side of current

  const left = current - delta;
  const right = current + delta;

  pages.push(1);

  if (left > 2) pages.push("…");

  for (let i = Math.max(2, left); i <= Math.min(total - 1, right); i++) {
    pages.push(i);
  }

  if (right < total - 1) pages.push("…");

  pages.push(total);

  return pages;
}

export function ProductsPagination({ totalPages }: Props) {
  const { currentPage, goToPage, goNext, goPrev, isFirst, isLast } =
    useProductPagination(totalPages);

  if (totalPages <= 1) return null;

  const pages = buildPageRange(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1 select-none"
    >
      {/* Previous */}
      <Button
        variant="outline"
        size="icon"
        onClick={goPrev}
        disabled={isFirst}
        aria-label="Previous page"
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page numbers */}
      {pages.map((page, i) =>
        page === "…" ? (
          <span
            key={`ellipsis-${i}`}
            className="flex items-center justify-center h-8 w-8 text-muted-foreground"
            aria-hidden
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="icon"
            onClick={() => goToPage(page)}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
            className="h-8 w-8"
          >
            {page}
          </Button>
        ),
      )}

      {/* Next */}
      <Button
        variant="outline"
        size="icon"
        onClick={goNext}
        disabled={isLast}
        aria-label="Next page"
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
