"use client";

// features/org/analytics/hooks/useAnalytics.ts
// Thin client hook: calls the getAnalyticsData server action on date range changes.
// Skips the initial fetch when initialData already covers the loaded range.

import * as React from "react";
import type { AnalyticsData, AnalyticsDateRange } from "../types";
import { getAnalyticsData } from "../actions/getAnalyticsData";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseAnalyticsResult {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalytics(
  orgId: string,
  orgSlug: string,
  dateRange: AnalyticsDateRange,
  initialData: AnalyticsData | null = null,
): UseAnalyticsResult {
  const [data, setData] = React.useState<AnalyticsData | null>(initialData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Skip fetch on first render — initialData is already correct for the current range.
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    setError(null);

    getAnalyticsData(orgId, orgSlug, dateRange)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unexpected error occurred.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId, orgSlug, dateRange.start, dateRange.end, dateRange.granularity]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = React.useCallback(() => {
    setIsLoading(true);
    setError(null);

    getAnalyticsData(orgId, orgSlug, dateRange)
      .then((result) => {
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Unexpected error occurred.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [orgId, orgSlug, dateRange]);

  return { data, isLoading, error, refetch };
}
