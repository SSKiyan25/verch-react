"use client";

import { useState } from "react";
import { ProductsToolbar } from "./ProductsToolbar";
import { ProductsList } from "./ProductsList";
import { ProductsGrid } from "./ProductsGrid";
import { ProductsEmpty } from "./ProductsEmpty";
import { ProductsLoading } from "./ProductsLoading";
import { ProductsPagination } from "./ProductsPagination";
import { useProducts } from "../hooks/useProducts";
import { useProductCategories } from "../hooks/useProductCategories";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ViewMode = "grid" | "list";

export function ProductsContent() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const {
    products,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
    refresh,
    updateLocalProduct,
  } = useProducts();

  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useProductCategories();

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state logic ... (same as before)
  if (
    !isLoading &&
    products.length === 0 &&
    !filters.search &&
    !filters.status &&
    !filters.category_id
  ) {
    return (
      <div className="space-y-6">
        <ProductsEmpty />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProductsToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={filters}
        onFiltersChange={updateFilters}
        onClearFilters={clearFilters}
        totalProducts={pagination.total}
        categories={categories}
        categoriesLoading={categoriesLoading}
        categoriesError={categoriesError}
      />

      {isLoading ? (
        <ProductsLoading viewMode={viewMode} />
      ) : products.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">
              {filters.search || filters.status || filters.category_id
                ? "Try adjusting your filters to see more results."
                : "Start by creating your first product."}
            </p>
          </div>
          {(filters.search || filters.status || filters.category_id) && (
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* 2. Pass the updater function down.
              Note: You'll need to update ProductsGrid/ProductsList to accept this prop.
          */}
          {viewMode === "grid" ? (
            <ProductsGrid
              products={products}
              onProductUpdate={updateLocalProduct}
            />
          ) : (
            <ProductsList
              products={products}
              onProductUpdate={updateLocalProduct}
            />
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <ProductsPagination
              pagination={pagination}
              onPageChange={goToPage}
              onNext={nextPage}
              onPrevious={previousPage}
              onPageSizeChange={changePageSize}
            />
          )}
        </>
      )}
    </div>
  );
}
