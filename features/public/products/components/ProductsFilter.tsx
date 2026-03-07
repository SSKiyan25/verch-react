"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { SlidersHorizontal, X } from "lucide-react";
import { useProductFilters } from "../hooks/useProductFilters";

export type FilterCategory = {
  id: string;
  name: string;
  slug: string;
};

type FilterPanelProps = {
  categories: FilterCategory[];
  categoryId: string | undefined;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  onSelectCategory: (id: string | undefined) => void;
  onApplyPrice: (min: number | undefined, max: number | undefined) => void;
  onClear: () => void;
};

function FilterPanel({
  categories,
  categoryId,
  minPrice,
  maxPrice,
  onSelectCategory,
  onApplyPrice,
  onClear,
}: FilterPanelProps) {
  // Local draft state for price inputs — resets on remount (via key prop in parent)
  const [localMin, setLocalMin] = useState(
    minPrice !== undefined ? String(minPrice) : "",
  );
  const [localMax, setLocalMax] = useState(
    maxPrice !== undefined ? String(maxPrice) : "",
  );

  const handleApplyPrice = () => {
    const min = localMin !== "" ? Number(localMin) : undefined;
    const max = localMax !== "" ? Number(localMax) : undefined;
    onApplyPrice(min, max);
  };

  const hasActiveFilters =
    categoryId !== undefined ||
    minPrice !== undefined ||
    maxPrice !== undefined;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">Filters</span>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      <Separator />

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Category
          </Label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSelectCategory(undefined)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                categoryId === undefined
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary hover:text-primary"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  onSelectCategory(categoryId === cat.id ? undefined : cat.id)
                }
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  categoryId === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary hover:text-primary"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Price Range */}
      <div className="flex flex-col gap-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Price Range
        </Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
              ₱
            </span>
            <Input
              type="number"
              min={0}
              placeholder="Min"
              value={localMin}
              onChange={(e) => setLocalMin(e.target.value)}
              className="pl-6 h-8 text-sm"
            />
          </div>
          <span className="text-muted-foreground text-xs">–</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
              ₱
            </span>
            <Input
              type="number"
              min={0}
              placeholder="Max"
              value={localMax}
              onChange={(e) => setLocalMax(e.target.value)}
              className="pl-6 h-8 text-sm"
            />
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleApplyPrice}
          className="w-full"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

type Props = {
  categories: FilterCategory[];
};

export function ProductsFilter({ categories }: Props) {
  const {
    categoryId,
    minPrice,
    maxPrice,
    isSearchActive,
    setCategory,
    setPriceRange,
    clearFilters,
  } = useProductFilters();

  // Hide filter entirely when a search is active
  if (isSearchActive) return null;

  const activeFilterCount = [
    categoryId !== undefined,
    minPrice !== undefined || maxPrice !== undefined,
  ].filter(Boolean).length;

  const panelKey = `${String(minPrice ?? "")}-${String(maxPrice ?? "")}`;

  const panelProps: FilterPanelProps = {
    categories,
    categoryId,
    minPrice,
    maxPrice,
    onSelectCategory: setCategory,
    onApplyPrice: setPriceRange,
    onClear: clearFilters,
  };

  return (
    <>
      {/* Desktop sidebar — hidden below lg via CSS, no JS branching */}
      <aside className="hidden lg:block sticky top-4 w-56 shrink-0 self-start">
        <FilterPanel key={panelKey} {...panelProps} />
      </aside>

      {/* Mobile drawer — hidden at lg and above via CSS */}
      <div className="lg:hidden">
        <Drawer>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="pb-0">
              <DrawerTitle>Filters</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 pb-6 overflow-y-auto">
              <FilterPanel
                key={panelKey}
                {...panelProps}
                onSelectCategory={(id) => {
                  setCategory(id);
                }}
                onApplyPrice={(min, max) => {
                  setPriceRange(min, max);
                }}
              />
              <DrawerClose asChild>
                <Button className="w-full mt-4">Done</Button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
