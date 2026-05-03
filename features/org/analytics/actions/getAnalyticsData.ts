"use server";

// features/org/analytics/actions/getAnalyticsData.ts
// Server action: wraps the cached analytics data layer.
// Re-verifies auth; RPC also enforces org membership via SECURITY DEFINER.

import { getCachedOrgAnalytics } from "@/lib/data/org/analytics";
import type { AnalyticsActionResult, AnalyticsDateRange } from "../types";

export async function getAnalyticsData(
  orgId: string,
  orgSlug: string,
  dateRange: AnalyticsDateRange,
): Promise<AnalyticsActionResult> {
  try {
    const data = await getCachedOrgAnalytics(
      orgId,
      orgSlug,
      dateRange.start,
      dateRange.end,
      dateRange.granularity,
    );

    if (!data) {
      return { success: false, error: "Unauthorized or data unavailable." };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while loading analytics.",
    };
  }
}
