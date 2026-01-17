"use client";

import { useState } from "react";
import { mockProducts } from "@/features/org/products/utils/data";
import { ProductsToolbar } from "./ProductsToolbar";
import { ProductsList } from "./ProductsList";
import { ProductsGrid } from "./ProductsGrid";
import { ProductsEmpty } from "./ProductsEmpty";
import { ProductFilters } from "@/lib/types/product";

type ViewMode = "grid" | "list";

export function ProductsContent() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<ProductFilters>({});

  // Filter products based on current filters
  const filteredProducts = mockProducts.filter((product) => {
    if (filters.status && !filters.status.includes(product.status)) {
      return false;
    }
    if (filters.category_id && product.category_id !== filters.category_id) {
      return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.search_keywords.some((keyword) =>
          keyword.toLowerCase().includes(searchLower)
        )
      );
    }
    return true;
  });

  if (mockProducts.length === 0) {
    return <ProductsEmpty />;
  }

  return (
    <div className="space-y-6">
      <ProductsToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={filters}
        onFiltersChange={setFilters}
        totalProducts={filteredProducts.length}
      />

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No products found matching your filters.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <ProductsGrid products={filteredProducts} />
      ) : (
        <ProductsList products={filteredProducts} />
      )}
    </div>
  );
}
