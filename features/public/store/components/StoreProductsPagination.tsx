"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

type StoreProductsPaginationProps = {
  page: number;
  totalPages: number;
  orgId: string;
};

export function StoreProductsPagination({
  page,
  totalPages,
  orgId,
}: StoreProductsPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (totalPages <= 1) return null;

  function goToPage(targetPage: number) {
    if (targetPage < 1 || targetPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    startTransition(() => {
      router.push(`/stores/${orgId}?${params.toString()}`);
    });
  }

  return (
    <div
      className="flex items-center justify-center gap-3 mt-8"
      aria-label="Pagination"
    >
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
      <span className="text-sm text-muted-foreground">
        Page <span className="font-semibold text-foreground">{page}</span> of{" "}
        <span className="font-semibold text-foreground">{totalPages}</span>
      </span>
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
