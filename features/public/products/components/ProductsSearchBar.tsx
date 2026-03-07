"use client";

import { useState, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useProductFilters } from "../hooks/useProductFilters";

export function ProductsSearchBar() {
  const { search, setSearch, clearSearch, isSearchActive } =
    useProductFilters();

  // Initial value comes from the URL; the parent passes `key={search}` so
  // this component remounts whenever the URL search param changes externally.
  const [inputValue, setInputValue] = useState(search ?? "");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim()) {
        setSearch(val.trim());
      } else {
        clearSearch();
      }
    }, 400);
  };

  const handleClear = () => {
    setInputValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    clearSearch();
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search products..."
          value={inputValue}
          onChange={handleChange}
          className="pl-9 pr-8 bg-card border-border shadow-sm"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {isSearchActive && (
        <p className="text-xs text-muted-foreground">
          Searching for:{" "}
          <span className="font-medium text-foreground">{search}</span>
        </p>
      )}
    </div>
  );
}
