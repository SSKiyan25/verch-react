"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Package,
  Loader2,
  CheckSquare,
  Square,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// NativeCheckbox — React 19 compatible alternative to Radix Checkbox
// Avoids the compose-refs infinite loop bug (radix-ui/primitives#3799)
// ---------------------------------------------------------------------------
type NativeCheckboxProps = {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

function NativeCheckbox({
  id,
  checked,
  onCheckedChange,
  disabled,
  className,
}: NativeCheckboxProps) {
  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onCheckedChange(!checked);
      }}
      className={cn(
        "size-4 shrink-0 rounded-[4px] border-2 border-primary shadow-xs transition-all duration-200 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked && "bg-primary text-primary-foreground",
        !checked && "bg-background",
        className,
      )}
    >
      {checked && <Check className="size-3 mx-auto" strokeWidth={3} />}
    </button>
  );
}

type SimpleProduct = {
  id: string;
  name: string;
  status: string;
};

type ProductSelectorProps = {
  products: SimpleProduct[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
};

export function ProductSelector({
  products,
  selectedIds,
  onSelectionChange,
  isLoading = false,
  disabled = false,
  className,
}: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!debouncedQuery.trim()) return products;

    const query = debouncedQuery.toLowerCase().trim();
    return products.filter((product) =>
      product.name.toLowerCase().includes(query),
    );
  }, [products, debouncedQuery]);

  // Selection helpers
  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.includes(p.id));

  const someFilteredSelected =
    filteredProducts.some((p) => selectedIds.includes(p.id)) &&
    !allFilteredSelected;

  const handleToggle = (productId: string) => {
    if (disabled) return;

    const newSelection = selectedIds.includes(productId)
      ? selectedIds.filter((id) => id !== productId)
      : [...selectedIds, productId];

    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (disabled) return;

    const newIds = new Set(selectedIds);
    filteredProducts.forEach((p) => newIds.add(p.id));
    onSelectionChange(Array.from(newIds));
  };

  const handleClearAll = () => {
    if (disabled) return;

    const filteredIds = new Set(filteredProducts.map((p) => p.id));
    const newSelection = selectedIds.filter((id) => !filteredIds.has(id));
    onSelectionChange(newSelection);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    searchInputRef.current?.focus();
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("border-muted", className)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm font-medium">Loading products...</p>
            <p className="text-xs mt-1">Please wait</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state - no products
  if (products.length === 0) {
    return (
      <Card className={cn("border-muted", className)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">No published products found</p>
            <p className="text-xs mt-1 text-center max-w-xs">
              Create and publish products to use them in promotions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-muted", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search products by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="pl-9 pr-9 h-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              disabled={disabled}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Selection controls */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {selectedIds.length} selected
            </Badge>
            {debouncedQuery && (
              <span className="text-xs text-muted-foreground">
                {filteredProducts.length} of {products.length} shown
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              disabled={
                disabled || allFilteredSelected || filteredProducts.length === 0
              }
              className="h-7 px-2 text-xs"
            >
              <CheckSquare className="h-3.5 w-3.5 mr-1" />
              Select All
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={
                disabled || (!someFilteredSelected && !allFilteredSelected)
              }
              className="h-7 px-2 text-xs"
            >
              <Square className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        {/* Products list */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm font-medium">No products found</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        ) : (
          // Native scrollable div - avoids Radix ScrollArea React 19 infinite loop bug
          <div className="h-[280px] w-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div className="space-y-1 pr-2">
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);

                return (
                  <div
                    key={product.id}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors duration-200 cursor-pointer",
                      isSelected
                        ? "bg-accent/50 hover:bg-accent/70"
                        : "hover:bg-accent/30",
                      disabled && "opacity-50 cursor-not-allowed",
                    )}
                    onClick={() => !disabled && handleToggle(product.id)}
                  >
                    <NativeCheckbox
                      id={`product-${product.id}`}
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(product.id)}
                      disabled={disabled}
                      className="pointer-events-none"
                    />
                    <Label
                      htmlFor={`product-${product.id}`}
                      className={cn(
                        "flex-1 cursor-pointer font-normal text-sm leading-snug pointer-events-none",
                        isSelected && "font-medium",
                      )}
                    >
                      {product.name}
                    </Label>
                    {isSelected && (
                      <CheckSquare className="h-4 w-4 text-primary opacity-70" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer info */}
        {selectedIds.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              This promotion will apply to{" "}
              <span className="font-medium text-foreground">
                {selectedIds.length}
              </span>{" "}
              product{selectedIds.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
