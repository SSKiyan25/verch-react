"use client";

import { Grid3X3, List, Search, Package, Layers } from "lucide-react";
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
import { mockCategories } from "@/features/org/products/utils/data";
import Link from "next/link";

interface ProductsToolbarProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  totalProducts: number;
}

const statusOptions: { value: ProductStatus; label: string }[] = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "archived", label: "Archived" },
];

export function ProductsToolbar({
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  totalProducts,
}: ProductsToolbarProps) {
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-10"
            value={filters.search || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
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
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {mockCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {totalProducts} product{totalProducts !== 1 ? "s" : ""}
          </Badge>
          {(filters.search || filters.status || filters.category_id) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFiltersChange({})}
              className="h-8 px-2 text-xs"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
