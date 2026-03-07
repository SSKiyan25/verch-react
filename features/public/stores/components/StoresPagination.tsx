"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

type StoresPaginationProps = {
  page: number;
  totalPages: number;
};

export function StoresPagination({ page, totalPages }: StoresPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (totalPages <= 1) return null;

  function goToPage(targetPage: number) {
    if (targetPage < 1 || targetPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    startTransition(() => {
      router.push(`/stores?${params.toString()}`);
    });
  }

  return (
    <div
      className="flex items-center justify-center gap-3"
      aria-label="Pagination"
    >
      {/* Previous */}
      <button
        type="button"
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1 || isPending}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </button>

      {/* Page indicator */}
      <span className="text-sm text-muted-foreground">
        Page <span className="font-semibold text-foreground">{page}</span> of{" "}
        <span className="font-semibold text-foreground">{totalPages}</span>
      </span>

      {/* Next */}
      <button
        type="button"
        onClick={() => goToPage(page + 1)}
        disabled={page >= totalPages || isPending}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Next page"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
