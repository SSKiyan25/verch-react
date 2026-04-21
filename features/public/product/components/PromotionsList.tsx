"use client";

import { Tag, Clock, AlertCircle } from "lucide-react";
import { PromotionBadge } from "./PromotionBadge";
import type { ProductActivePromotion } from "@/lib/types/public-promotions";

type PromotionsListProps = {
  promotions: ProductActivePromotion[];
  maxDisplay?: number;
};

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Display list of active promotions on product detail page.
 * Shows up to 3 promotions with eligibility status.
 *
 * Features:
 * - Eligible promotions shown first
 * - Expiry date display
 * - Minimum order requirements
 * - Empty state when no promotions available
 */
export function PromotionsList({
  promotions,
  maxDisplay = 3,
}: PromotionsListProps) {
  const displayPromotions = promotions.slice(0, maxDisplay);
  const eligibleCount = promotions.filter((p) => p.isEligible).length;

  // Empty state
  if (promotions.length === 0) {
    return null; // Don't show section if no promotions
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-primary" strokeWidth={2} />
        <h3 className="text-sm font-semibold">
          Active Promotions {eligibleCount > 0 && `(${eligibleCount})`}
        </h3>
      </div>

      {/* Promotions list */}
      <div className="space-y-2">
        {displayPromotions.map((promotion) => (
          <div
            key={promotion.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors duration-200 ${
              promotion.isEligible
                ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900"
                : "bg-muted/30 border-border"
            }`}
          >
            {/* Badge */}
            <div className="shrink-0 mt-0.5">
              <PromotionBadge promotion={promotion} size="sm" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <p
                className={`text-sm font-medium ${
                  promotion.isEligible
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {promotion.name}
              </p>

              {promotion.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {promotion.description}
                </p>
              )}

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {/* Expiry */}
                {promotion.endsAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Until {formatDate(promotion.endsAt)}
                  </span>
                )}

                {/* Min order */}
                {promotion.minimumOrderAmount && (
                  <span>
                    Min: ₱
                    {new Intl.NumberFormat("en-PH", {
                      minimumFractionDigits: 0,
                    }).format(promotion.minimumOrderAmount)}
                  </span>
                )}
              </div>

              {/* Ineligible reason */}
              {!promotion.isEligible && promotion.ineligibleReason && (
                <div className="flex items-start gap-1.5 mt-1.5 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{promotion.ineligibleReason}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* More promotions indicator */}
      {promotions.length > maxDisplay && (
        <p className="text-xs text-muted-foreground text-center">
          +{promotions.length - maxDisplay} more promotion
          {promotions.length - maxDisplay > 1 ? "s" : ""} available
        </p>
      )}
    </div>
  );
}
