// features/org/analytics/components/KpiCard.tsx
// Pure render component — accepts props, renders a KPI stat card.
// No business logic, no direct server action calls.

import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Currency Helper ──────────────────────────────────────────────────────────

function formatValue(
  value: number,
  prefix?: string,
  suffix?: string,
  decimals = 0,
): string {
  const formatted = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return `${prefix ?? ""}${formatted}${suffix ?? ""}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type KpiCardProps = {
  title: string;
  value: number;
  /** E.g. "₱" for monetary values */
  prefix?: string;
  /** E.g. "%" or " orders" */
  suffix?: string;
  /** Number of decimal places (default 0; monetary usually 2) */
  decimals?: number;
  /** Percentage change vs previous period. Positive = up, negative = down. */
  changePercent?: number | null;
  /** lucide-react icon component */
  icon?: LucideIcon;
  /** Show skeleton loading state */
  isLoading?: boolean;
  /** Optional accent colour class applied to the icon background */
  accentClass?: string;
  className?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function KpiCard({
  title,
  value,
  prefix,
  suffix,
  decimals = 0,
  changePercent,
  icon: Icon,
  isLoading = false,
  accentClass = "bg-primary/10",
  className,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm",
          className,
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-32 rounded mb-2" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
    );
  }

  // Change indicator
  const hasChange = changePercent !== undefined && changePercent !== null;
  const isPositive = hasChange && changePercent! > 0;
  const isNegative = hasChange && changePercent! < 0;
  const isNeutral = hasChange && changePercent === 0;

  const TrendIcon = isPositive
    ? TrendingUpIcon
    : isNegative
      ? TrendingDownIcon
      : MinusIcon;

  const trendColorClass = isPositive
    ? "text-emerald-600 dark:text-emerald-400"
    : isNegative
      ? "text-red-500 dark:text-red-400"
      : "text-muted-foreground";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group",
        className,
      )}
    >
      {/* Decorative background gradient */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.06] bg-primary" />

      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {Icon && (
          <div
            className={cn(
              "rounded-lg p-0 transition-transform duration-200 group-hover:scale-110",
              accentClass,
            )}
          >
            <Icon className="h-4 w-4 text-foreground/70" />
          </div>
        )}
      </div>

      <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
        {formatValue(value, prefix, suffix, decimals)}
      </p>

      {hasChange && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-medium",
            trendColorClass,
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          <span>
            {isNeutral
              ? "No change"
              : `${isPositive ? "+" : ""}${changePercent!.toFixed(1)}% vs prev period`}
          </span>
        </div>
      )}
    </div>
  );
}
