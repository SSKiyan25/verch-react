// features/org/analytics/utils/exportExcel.ts
// Pure utility — no React imports.
// Builds a multi-sheet XLSX workbook from AnalyticsData and triggers a browser download.
// Uses SheetJS (xlsx package).

import * as XLSX from "xlsx";
import type { AnalyticsData } from "../types";

// ─── Sheet Builders ───────────────────────────────────────────────────────────

function buildOverviewSheet(data: AnalyticsData): XLSX.WorkSheet {
  const rows = [
    ["Metric", "Value"],
    ["Total Revenue (₱)", data.overview.total_revenue],
    ["Total Orders", data.overview.total_orders],
    ["Average Order Value (₱)", data.overview.avg_order_value],
    ["Total Commission (₱)", data.overview.total_commission],
    ["Total Payout (₱)", data.overview.total_payout],
    [],
    ["Date Range Start", data.date_range.start],
    ["Date Range End", data.date_range.end],
    ["Granularity", data.date_range.granularity],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 18 }];
  return ws;
}

function buildRevenueSheet(data: AnalyticsData): XLSX.WorkSheet {
  const header = ["Period", "Revenue (₱)", "Orders", "Payout (₱)"];
  const rows = data.revenue_over_time.map((p) => [
    p.period,
    p.revenue,
    p.orders,
    p.payout,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 16 }];
  return ws;
}

function buildOrdersByStatusSheet(data: AnalyticsData): XLSX.WorkSheet {
  const header = ["Status", "Order Count", "Total Amount (₱)"];
  const rows = data.orders_by_status.map((e) => [
    e.status,
    e.count,
    e.total_amount,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 18 }];
  return ws;
}

function buildTopProductsSheet(data: AnalyticsData): XLSX.WorkSheet {
  const header = ["Rank", "Product Name", "Qty Sold", "Revenue (₱)", "Order Count"];
  const rows = data.top_products.map((p, idx) => [
    idx + 1,
    p.product_name,
    p.quantity_sold,
    p.revenue,
    p.order_count,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [{ wch: 6 }, { wch: 36 }, { wch: 12 }, { wch: 16 }, { wch: 13 }];
  return ws;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds a multi-sheet XLSX workbook from `AnalyticsData` and triggers a browser download.
 *
 * Sheets produced:
 *   1. Overview  — KPI summary + date range
 *   2. Revenue   — revenue/orders/payout over time
 *   3. Orders by Status — breakdown per order_status
 *   4. Top Products — ranked product performance
 *
 * @param data      Full analytics payload
 * @param orgSlug   Organisation slug — used in the file name
 * @param dateStr   ISO date string (YYYY-MM-DD) for the file name suffix
 */
export function exportAnalyticsExcel(
  data: AnalyticsData,
  orgSlug: string,
  dateStr: string,
): void {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildOverviewSheet(data), "Overview");
  XLSX.utils.book_append_sheet(wb, buildRevenueSheet(data), "Revenue");
  XLSX.utils.book_append_sheet(wb, buildOrdersByStatusSheet(data), "Orders by Status");
  XLSX.utils.book_append_sheet(wb, buildTopProductsSheet(data), "Top Products");

  const filename = `verch-analytics-${orgSlug}-${dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
}
