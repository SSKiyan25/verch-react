"use client";

import { PromotionFilters } from "./PromotionFilters";
import { PromotionCard } from "./PromotionCard";
import { PromotionEmptyState } from "./PromotionEmptyState";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, AlertCircle, Filter } from "lucide-react";
import Link from "next/link";
import type { OrgPromotionListItem } from "@/lib/types/org-promotions";
import { usePromotionFilters } from "../hooks/usePromotionFilters";

type PromotionsShellProps = {
  promotions: OrgPromotionListItem[];
  totalCount: number;
  orgId: string;
};

export function PromotionsShell({
  promotions,
  totalCount,
  orgId,
}: PromotionsShellProps) {
  const {
    filters,
    setStatus,
    setTriggerType,
    setSearch,
    clearFilters,
    hasActiveFilters,
  } = usePromotionFilters();

  // Count draft and paused promotions (not visible to customers)
  const draftCount = promotions.filter((p) => p.status === "draft").length;
  const pausedCount = promotions.filter((p) => p.status === "paused").length;
  const inactiveCount = draftCount + pausedCount;
  const showInactiveAlert = inactiveCount > 0 && !filters.status; // Only show when not filtering by status

  // Empty state logic - show empty state only when no filters are active
  if (promotions.length === 0 && !hasActiveFilters) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Promotions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage discounts and special offers
            </p>
          </div>
          <Button asChild>
            <Link href="/org/promotions/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Promotion
            </Link>
          </Button>
        </div>
        <PromotionEmptyState hasFilters={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Promotions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount} {totalCount === 1 ? "promotion" : "promotions"} total
          </p>
        </div>
        <Button asChild>
          <Link href="/org/promotions/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Promotion
          </Link>
        </Button>
      </div>

      {/* Inactive Promotions Alert */}
      {showInactiveAlert && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">
            {inactiveCount} {inactiveCount === 1 ? "promotion is" : "promotions are"} not visible to customers
          </AlertTitle>
          <AlertDescription className="text-amber-800 mt-2">
            <span className="block mb-2">
              {draftCount > 0 && `${draftCount} in draft status`}
              {draftCount > 0 && pausedCount > 0 && ", "}
              {pausedCount > 0 && `${pausedCount} paused`}
              . These promotions won&apos;t appear on product pages or checkout until activated.
            </span>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 hover:bg-amber-100 text-amber-900 h-8"
              onClick={() => setStatus("draft")}
            >
              <Filter className="w-3 h-3 mr-1.5" />
              Show draft promotions
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <PromotionFilters
        filters={filters}
        onStatusChange={setStatus}
        onTriggerTypeChange={setTriggerType}
        onSearchChange={setSearch}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Content */}
      {promotions.length === 0 ? (
        <PromotionEmptyState hasFilters={hasActiveFilters} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promotion) => (
            <PromotionCard
              key={promotion.id}
              promotion={promotion}
              orgId={orgId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
