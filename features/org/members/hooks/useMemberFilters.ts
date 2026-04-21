"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { MembershipStatus } from "@/lib/types/org-memberships";

export type MemberFilters = {
  status?: MembershipStatus;
  search?: string;
  page: number;
};

export function useMemberFilters(currentFilters: MemberFilters) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilters = useCallback(
    (updates: Partial<MemberFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Always reset to page 1 when filters change (except when changing page)
      if (!("page" in updates)) {
        params.delete("page");
      }

      if (updates.status !== undefined) {
        if (updates.status) params.set("status", updates.status);
        else params.delete("status");
      }

      if (updates.search !== undefined) {
        const trimmed = updates.search?.trim();
        if (trimmed) params.set("search", trimmed);
        else params.delete("search");
      }

      if (updates.page !== undefined) {
        if (updates.page > 1) params.set("page", String(updates.page));
        else params.delete("page");
      }

      startTransition(() => {
        router.replace(`/org/members?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.replace("/org/members");
    });
  }, [router]);

  return {
    currentFilters,
    updateFilters,
    clearFilters,
    isPending,
  };
}
