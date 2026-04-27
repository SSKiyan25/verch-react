"use client";

import { useCallback, useMemo, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon, Search, X, RotateCcw, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/features/org/orders/constants";
import type { ProductOrderFilterValues } from "@/features/org/orders/hooks/useProductOrderFilters";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrgProductOrderFiltersProps = {
  filters: ProductOrderFilterValues;
  hasActiveFilters: boolean;
  onFilterChange: (key: keyof ProductOrderFilterValues, value: string) => void;
  onReset: () => void;
  /** Optional: list of variation IDs for the currently selected product */
  variations?: { id: string; name: string }[];
  /** Whether to show the variation filter (detail page only) */
  showVariationFilter?: boolean;
};

// ─── Date Range Picker Sub-component ──────────────────────────────────────────

function DateRangePicker({
  dateFrom,
  dateTo,
  onFromChange,
  onToChange,
}: {
  dateFrom: string;
  dateTo: string;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const fromDate = useMemo(
    () => (dateFrom ? parse(dateFrom, "yyyy-MM-dd", new Date()) : undefined),
    [dateFrom],
  );
  const toDate = useMemo(
    () => (dateTo ? parse(dateTo, "yyyy-MM-dd", new Date()) : undefined),
    [dateTo],
  );

  const displayValue = useMemo(() => {
    if (dateFrom && dateTo)
      return `${format(fromDate!, "MMM d, yyyy")} – ${format(toDate!, "MMM d, yyyy")}`;
    if (dateFrom) return `From ${format(fromDate!, "MMM d, yyyy")}`;
    if (dateTo) return `Until ${format(toDate!, "MMM d, yyyy")}`;
    return "";
  }, [dateFrom, dateTo, fromDate, toDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 w-full justify-start text-left font-normal",
            !dateFrom && !dateTo && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{displayValue || "Date range"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{
            from: fromDate,
            to: toDate,
          }}
          onSelect={(range) => {
            if (range?.from && isValid(range.from)) {
              onFromChange(format(range.from, "yyyy-MM-dd"));
            } else if (!range?.from) {
              onFromChange("");
            }
            if (range?.to && isValid(range.to)) {
              onToChange(format(range.to, "yyyy-MM-dd"));
            } else if (range?.from && !range?.to) {
              onToChange("");
            }
            if (!range) {
              onFromChange("");
              onToChange("");
            }
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrgProductOrderFilters({
  filters,
  hasActiveFilters,
  onFilterChange,
  onReset,
  variations,
  showVariationFilter = false,
}: OrgProductOrderFiltersProps) {
  // Debounced search — we use a local state + flush on blur/enter
  const [searchInput, setSearchInput] = useState(filters.search);

  const handleSearchCommit = useCallback(() => {
    onFilterChange("search", searchInput);
  }, [onFilterChange, searchInput]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSearchCommit();
      }
    },
    [handleSearchCommit],
  );

  // Sync external search changes
  useMemo(() => {
    if (filters.search !== searchInput && !searchInput && !filters.search) {
      // both empty — no-op
    }
  }, [filters.search, searchInput]);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* ── Top row: label + reset ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-1.5">
              Active
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      {/* ── Filter controls ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Date Range */}
        <div className="min-w-[220px] flex-1 max-w-[280px]">
          <DateRangePicker
            dateFrom={filters.date_from}
            dateTo={filters.date_to}
            onFromChange={(val) => onFilterChange("date_from", val)}
            onToChange={(val) => onFilterChange("date_to", val)}
          />
        </div>

        {/* Product Search */}
        <div className="min-w-[180px] flex-1 max-w-[240px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search product..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onBlur={handleSearchCommit}
              onKeyDown={handleSearchKeyDown}
              className="h-9 pl-8 text-sm"
            />
            {searchInput !== filters.search && searchInput && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={handleSearchCommit}
              >
                <Search className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="min-w-[140px] flex-1 max-w-[180px]">
          <Select
            value={filters.status}
            onValueChange={(val) =>
              onFilterChange("status", val === "all" ? "" : val)
            }
          >
            <SelectTrigger size="sm" className="h-9 w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Variation Filter (detail page only) */}
        {showVariationFilter && variations && variations.length > 0 && (
          <div className="min-w-[160px] flex-1 max-w-[200px]">
            <Select
              value={filters.variation_id}
              onValueChange={(val) =>
                onFilterChange("variation_id", val === "all" ? "" : val)
              }
            >
              <SelectTrigger size="sm" className="h-9 w-full">
                <SelectValue placeholder="All variations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All variations</SelectItem>
                {variations.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Active filter count badge (mobile) */}
        {hasActiveFilters && (
          <div className="flex sm:hidden items-center gap-1.5 text-xs text-muted-foreground">
            <X
              className="h-3 w-3 cursor-pointer hover:text-foreground"
              onClick={onReset}
            />
            Clear filters
          </div>
        )}
      </div>
    </div>
  );
}
