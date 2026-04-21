"use client";

import { cn } from "@/lib/utils";
import { OrgMembersTable } from "./OrgMembersTable";
import { OrgMembersTableFilters } from "./OrgMembersTableFilters";
import { useMembersTableFilters } from "@/features/org/members/hooks/useMembersTableFilters";
import type { OrgMembersResponse } from "@/lib/types/org-memberships";

// ---------------------------------------------------------------------------
// Props — Server passes down pre-fetched data; shell handles client state.
// ---------------------------------------------------------------------------

type OrgMembersShellProps = {
  result: OrgMembersResponse;
  currentSearch: string;
  currentLimit: number;
  currentPage: number;
};

// ---------------------------------------------------------------------------
// OrgMembersShell
// ---------------------------------------------------------------------------

export function OrgMembersShell({
  result,
  currentSearch,
  currentLimit,
  currentPage,
}: OrgMembersShellProps) {
  const {
    searchInput,
    handleSearchChange,
    setLimit,
    setPage,
    clearFilters,
    isPending,
  } = useMembersTableFilters({
    search: currentSearch,
    limit: currentLimit,
    page: currentPage,
  });

  return (
    <div
      className={cn(
        "space-y-4",
        isPending && "opacity-60 pointer-events-none transition-opacity",
      )}
    >
      <OrgMembersTableFilters
        searchInput={searchInput}
        limit={currentLimit}
        onSearchChange={handleSearchChange}
        onLimitChange={setLimit}
        onClear={clearFilters}
        isPending={isPending}
      />

      <OrgMembersTable
        members={result.data}
        totalCount={result.totalCount}
        page={currentPage}
        limit={currentLimit}
        onPageChange={setPage}
      />
    </div>
  );
}
