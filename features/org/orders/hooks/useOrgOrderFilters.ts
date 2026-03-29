"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { OrgOrderFilters } from "@/lib/supabase/queries/org-orders";

export function useOrgOrderFilters(currentFilters: OrgOrderFilters) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilters = useCallback(
    (updates: Partial<OrgOrderFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Always reset to page 1 when filters change (except when changing page)
      if (!("page" in updates)) {
        params.delete("page");
      }

      if (updates.status !== undefined) {
        if (updates.status) params.set("status", updates.status);
        else params.delete("status");
      }

      if (updates.paymentStatus !== undefined) {
        if (updates.paymentStatus) params.set("payment", updates.paymentStatus);
        else params.delete("payment");
      }

      if (updates.search !== undefined) {
        const trimmed = updates.search?.trim();
        if (trimmed) params.set("q", trimmed);
        else params.delete("q");
      }

      if (updates.page !== undefined) {
        if (updates.page > 1) params.set("page", String(updates.page));
        else params.delete("page");
      }

      startTransition(() => {
        router.replace(`/org/orders?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.replace("/org/orders");
    });
  }, [router]);

  return {
    currentFilters,
    updateFilters,
    clearFilters,
    isPending,
  };
}
