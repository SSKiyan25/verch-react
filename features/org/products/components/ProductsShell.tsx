"use client";

import { useState } from "react";
import { ProductsHeader } from "./ProductsHeader";
import { ProductsToolbar } from "./ProductsToolbar";
import { ProductsList } from "./ProductsList";
import { ProductsGrid } from "./ProductsGrid";
import { ProductsEmpty } from "./ProductsEmpty";
import { ProductsPagination } from "./ProductsPagination";
import { Button } from "@/components/ui/button";
import { useOrgProductFilters } from "../hooks/useOrgProductFilters";
import type {
  OrgProductListItem,
  OrgProductFilters,
} from "@/lib/types/org-products";
import type { PublicCategory } from "@/lib/supabase/queries/categories";

type ViewMode = "grid" | "list";

type ProductsShellProps = {
  products: OrgProductListItem[];
  totalCount: number;
  categories: PublicCategory[];
  orgId: string;
  filters: OrgProductFilters;
  page: number;
  limit: number;
};

export function ProductsShell({
  products,
  totalCount,
  categories,
  orgId,
}: ProductsShellProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const {
    currentFilters,
    currentPage,
    setStatus,
    setCategory,
    setSearch,
    setPage,
    resetFilters,
  } = useOrgProductFilters();

  // Empty state logic - show empty state only when no filters are active
  if (
    products.length === 0 &&
    !currentFilters.search &&
    !currentFilters.status &&
    !currentFilters.categoryId &&
    !currentFilters.isArchived
  ) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <ProductsHeader />
        <ProductsEmpty />
      </div>
    );
  }

  // Calculate pagination data
  const totalPages = Math.ceil(totalCount / 12);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <ProductsHeader />

      <ProductsToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={{
          status: currentFilters.status ? [currentFilters.status] : undefined,
          category_id: currentFilters.categoryId,
          search: currentFilters.search,
        }}
        onFiltersChange={(newFilters) => {
          if (newFilters.status !== undefined) {
            setStatus(
              newFilters.status?.[0] as OrgProductFilters["status"] | undefined,
            );
          }
          if (newFilters.category_id !== undefined) {
            setCategory(newFilters.category_id);
          }
          if (newFilters.search !== undefined) {
            setSearch(newFilters.search);
          }
        }}
        onClearFilters={resetFilters}
        totalProducts={totalCount}
        categories={categories}
        categoriesLoading={false}
        categoriesError={null}
      />

      {products.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">
              {currentFilters.search ||
              currentFilters.status ||
              currentFilters.categoryId
                ? "Try adjusting your filters to see more results."
                : "Start by creating your first product."}
            </p>
          </div>
          {(currentFilters.search ||
            currentFilters.status ||
            currentFilters.categoryId) && (
            <Button variant="outline" onClick={resetFilters} className="mt-4">
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <ProductsGrid products={products} orgId={orgId} />
          ) : (
            <ProductsList products={products} orgId={orgId} />
          )}

          {totalPages > 1 && (
            <ProductsPagination
              pagination={{
                page: currentPage,
                total: totalCount,
                pages: totalPages,
                limit: 12,
              }}
              onPageChange={setPage}
              onNext={() => setPage(currentPage + 1)}
              onPrevious={() => setPage(currentPage - 1)}
              onPageSizeChange={() => {
                // Page size change not implemented yet
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
