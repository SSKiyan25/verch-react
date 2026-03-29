"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrgOrderFilters as OrgOrderFiltersType } from "@/lib/supabase/queries/org-orders";

const STATUS_TABS = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Preparing", value: "preparing" },
  { label: "Ready", value: "ready" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
] as const;

const PAYMENT_STATUS_OPTIONS = [
  { label: "All payments", value: undefined },
  { label: "Pending", value: "pending" },
  { label: "Proof submitted", value: "proof_submitted" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Rejected", value: "rejected" },
] as const;

type OrgOrderFiltersProps = {
  currentFilters: OrgOrderFiltersType;
  onFilterChange: (updates: Partial<OrgOrderFiltersType>) => void;
  onClear: () => void;
  isPending: boolean;
};

export function OrgOrderFilters({
  currentFilters,
  onFilterChange,
  onClear,
  isPending,
}: OrgOrderFiltersProps) {
  const [inputValue, setInputValue] = useState(currentFilters.search ?? "");

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    onFilterChange({ search: trimmed || undefined });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClearSearch = () => {
    setInputValue("");
    onFilterChange({ search: undefined });
  };

  const hasActiveFilters = !!(
    currentFilters.status ||
    currentFilters.paymentStatus ||
    currentFilters.search
  );

  return (
    <div className="space-y-4">
      <div className="w-full overflow-x-auto no-scrollbar">
        <div className="flex gap-1 min-w-max pb-1">
          {STATUS_TABS.map((tab) => {
            const isActive = tab.value === currentFilters.status;
            return (
              <button
                key={tab.label}
                onClick={() => onFilterChange({ status: tab.value })}
                disabled={isPending}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  isPending && "opacity-50 cursor-not-allowed",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={currentFilters.paymentStatus ?? "all"}
          onValueChange={(value) =>
            onFilterChange({
              paymentStatus:
                value === "all"
                  ? undefined
                  : (value as OrgOrderFiltersType["paymentStatus"]),
            })
          }
          disabled={isPending}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All payments" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.label} value={option.value ?? "all"}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by order # or customer name..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPending}
              className="pl-9 pr-9"
            />
            {inputValue && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={handleSearch}
            disabled={isPending}
            className="shrink-0"
          >
            Search
          </Button>
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={isPending}
            className="shrink-0"
          >
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
