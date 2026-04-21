"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useTransition, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MembersTableFilters = {
  search: string;
  limit: number;
  page: number;
};

// ---------------------------------------------------------------------------
// useMembersTableFilters
// Manages URL params: ?search=&limit=&page=
// Debounces search by 300ms.
// Routes to /org/members (never /org/settings/memberships — see learning).
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function useMembersTableFilters(initialFilters: MembersTableFilters) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local search state for the debounced input
  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Internal URL push ────────────────────────────────────────────────────

  const pushParams = useCallback(
    (updates: Partial<MembersTableFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Changing anything other than page → reset to page 1
      if (!("page" in updates)) {
        params.delete("page");
      }

      if (updates.search !== undefined) {
        const trimmed = updates.search.trim();
        if (trimmed) params.set("search", trimmed);
        else params.delete("search");
      }

      if (updates.limit !== undefined) {
        if (updates.limit !== DEFAULT_LIMIT)
          params.set("limit", String(updates.limit));
        else params.delete("limit");
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

  // ── Debounced search ─────────────────────────────────────────────────────

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        pushParams({ search: value });
      }, SEARCH_DEBOUNCE_MS);
    },
    [pushParams],
  );

  // ── Public setters ───────────────────────────────────────────────────────

  const setLimit = useCallback(
    (limit: number) => pushParams({ limit }),
    [pushParams],
  );

  const setPage = useCallback(
    (page: number) => pushParams({ page }),
    [pushParams],
  );

  const clearFilters = useCallback(() => {
    setSearchInput("");
    startTransition(() => {
      router.replace("/org/members");
    });
  }, [router]);

  return {
    searchInput,
    handleSearchChange,
    setLimit,
    setPage,
    clearFilters,
    isPending,
  };
}
