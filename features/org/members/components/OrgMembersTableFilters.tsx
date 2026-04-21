"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants — NEVER use value="" per learning 2026-04-05-empty-string-select-item-forbidden
// ---------------------------------------------------------------------------

const LIMIT_OPTIONS = [
  { value: "10", label: "10 / page" },
  { value: "20", label: "20 / page" },
  { value: "50", label: "50 / page" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type OrgMembersTableFiltersProps = {
  searchInput: string;
  limit: number;
  onSearchChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onClear: () => void;
  isPending?: boolean;
};

// ---------------------------------------------------------------------------
// OrgMembersTableFilters
// ---------------------------------------------------------------------------

export function OrgMembersTableFilters({
  searchInput,
  limit,
  onSearchChange,
  onLimitChange,
  onClear,
  isPending = false,
}: OrgMembersTableFiltersProps) {
  const hasActiveFilters = searchInput.trim() !== "";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left group: search + tier */}
      <div className="flex flex-1 items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or email…"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn("pl-8 h-9", isPending && "opacity-70")}
            aria-label="Search members"
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-9 px-2 text-muted-foreground hover:text-foreground"
            aria-label="Clear filters"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Right group: page size */}
      <Select
        value={String(limit)}
        onValueChange={(v) => onLimitChange(Number(v))}
      >
        <SelectTrigger className="h-9 w-[120px]" aria-label="Rows per page">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LIMIT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
