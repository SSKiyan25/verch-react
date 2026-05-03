// features/org/analytics/index.ts
// Barrel export for the org analytics feature.

export { AnalyticsDashboard } from "./components/AnalyticsDashboard";
export type { AnalyticsDashboardProps } from "./components/AnalyticsDashboard";

export type {
  AnalyticsGranularity,
  AnalyticsDateRange,
  AnalyticsOverview,
  RevenueDataPoint,
  OrderStatusBreakdown,
  TopProduct,
  AnalyticsData,
  AnalyticsActionResult,
} from "./types";
