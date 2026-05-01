"use client";

import { useState, useEffect } from "react";
import { Grid3X3, List, Search, Package, Layers, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductFilters, ProductStatus } from "@/lib/types/product";
import type { PublicCategory } from "@/lib/supabase/queries/categories";
import Link from "next/link";
import { useDebouncedSearch } from "../hooks/useDebouncedSearch";

interface ProductsToolbarProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  onClearFilters: () => void;
  totalProducts: number;
  categories: PublicCategory[];
  categoriesLoading: boolean;
  categoriesError: string | null;
  isPending?: boolean;
}

const statusOptions: { value: ProductStatus; label: string }[] = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
];

export function ProductsToolbar({
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  onClearFilters,
  totalProducts,
  categories,
  categoriesLoading,
  categoriesError,
  isPending = false,
}: ProductsToolbarProps) {
  // Local state for immediate UI updates
  const [searchInput, setSearchInput] = useState(filters.search || "");
  
  // Debounce the search input
  const debouncedSearch = useDebouncedSearch(searchInput, 400);

  // Update filters when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({ ...filters, search: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Sync local state when filters.search changes externally (e.g., from URL or clear filters)
  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  const hasActiveFilters = !!(
    filters.search ||
    filters.status ||
    filters.category_id
  );

  return (
    <div className="space-y-4">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b">
        <Button
          variant="ghost"
          className="border-b-2 border-primary rounded-none"
        >
          <Package className="w-4 h-4 mr-2" />
          Products
        </Button>
        <Link href="/org/products/bundles">
          <Button variant="ghost" className="rounded-none">
            <Layers className="w-4 h-4 mr-2" />
            Bundles
          </Button>
        </Link>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          {isPending ? (
            <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          )}
          <Input
            placeholder="Search products..."
            className="pl-10"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => onViewModeChange("grid")}
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="sr-only">Grid view</span>
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => onViewModeChange("list")}
            className="hidden md:flex"
          >
            <List className="w-4 h-4" />
            <span className="sr-only">List view</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select
          value={filters.status?.[0] || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              status: value === "all" ? undefined : [value as ProductStatus],
            })
          }
          disabled={isPending}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category_id || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              category_id: value === "all" ? undefined : value,
            })
          }
          disabled={isPending || categoriesLoading}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue
              placeholder={
                categoriesLoading
                  ? "Loading categories..."
                  : categoriesError
                    ? "Categories unavailable"
                    : "Filter by category"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoriesLoading ? (
              <SelectItem value="loading" disabled>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </div>
              </SelectItem>
            ) : categoriesError ? (
              <SelectItem value="error" disabled>
                Failed to load categories
              </SelectItem>
            ) : (
              categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {totalProducts} product{totalProducts !== 1 ? "s" : ""}
          </Badge>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8 px-2 text-xs"
              disabled={isPending}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
