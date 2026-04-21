"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X } from "lucide-react";
import type {
  OrgPromotionFilters,
  PromotionStatus,
  PromotionTriggerType,
} from "@/lib/types/org-promotions";

type PromotionFiltersProps = {
  filters: OrgPromotionFilters;
  onStatusChange: (status: PromotionStatus | null) => void;
  onTriggerTypeChange: (triggerType: PromotionTriggerType | null) => void;
  onSearchChange: (search: string | null) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "paused", label: "Paused" },
  { value: "expired", label: "Expired" },
  { value: "exhausted", label: "Exhausted" },
];

const TRIGGER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "auto", label: "Auto" },
  { value: "voucher_code", label: "Voucher Code" },
];

export function PromotionFilters({
  filters,
  onStatusChange,
  onTriggerTypeChange,
  onSearchChange,
  onClearFilters,
  hasActiveFilters,
}: PromotionFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Tabs
            value={filters.status ?? ""}
            onValueChange={(value) =>
              onStatusChange(value ? (value as PromotionStatus) : null)
            }
          >
            <TabsList className="grid grid-cols-6 w-full">
              {STATUS_OPTIONS.map((option) => (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className="text-xs"
                >
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Trigger Type Filter */}
        <Tabs
          value={filters.triggerType ?? ""}
          onValueChange={(value) =>
            onTriggerTypeChange(value ? (value as PromotionTriggerType) : null)
          }
        >
          <TabsList>
            {TRIGGER_TYPE_OPTIONS.map((option) => (
              <TabsTrigger
                key={option.value}
                value={option.value}
                className="text-xs"
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Search & Clear */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search promotions..."
            value={filters.search ?? ""}
            onChange={(e) => onSearchChange(e.target.value || null)}
            className="pl-9"
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
