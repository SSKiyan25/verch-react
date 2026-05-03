// features/org/analytics/utils/exportCsv.ts
// Pure utility — no React imports.
// Converts AnalyticsData to a CSV string and triggers a browser download.

import type { AnalyticsData } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  // Wrap in quotes if it contains a comma, newline, or double-quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsvCell).join(",");
}

function buildCsvContent(data: AnalyticsData): string {
  const lines: string[] = [];

  // ── Section 1: KPI Overview ──────────────────────────────────────────────
  lines.push("OVERVIEW");
  lines.push(rowToCsv(["Metric", "Value"]));
  lines.push(rowToCsv(["Total Revenue (₱)", data.overview.total_revenue.toFixed(2)]));
  lines.push(rowToCsv(["Total Orders", data.overview.total_orders]));
  lines.push(rowToCsv(["Average Order Value (₱)", data.overview.avg_order_value.toFixed(2)]));
  lines.push(rowToCsv(["Total Commission (₱)", data.overview.total_commission.toFixed(2)]));
  lines.push(rowToCsv(["Total Payout (₱)", data.overview.total_payout.toFixed(2)]));
  lines.push("");

  // ── Section 2: Revenue Over Time ─────────────────────────────────────────
  lines.push("REVENUE OVER TIME");
  lines.push(rowToCsv(["Period", "Revenue (₱)", "Orders", "Payout (₱)"]));
  for (const point of data.revenue_over_time) {
    lines.push(
      rowToCsv([
        point.period,
        point.revenue.toFixed(2),
        point.orders,
        point.payout.toFixed(2),
      ]),
    );
  }
  lines.push("");

  // ── Section 3: Orders by Status ──────────────────────────────────────────
  lines.push("ORDERS BY STATUS");
  lines.push(rowToCsv(["Status", "Order Count", "Total Amount (₱)"]));
  for (const entry of data.orders_by_status) {
    lines.push(rowToCsv([entry.status, entry.count, entry.total_amount.toFixed(2)]));
  }
  lines.push("");

  // ── Section 4: Top Products ───────────────────────────────────────────────
  lines.push("TOP PRODUCTS");
  lines.push(rowToCsv(["Rank", "Product Name", "Qty Sold", "Revenue (₱)", "Order Count"]));
  data.top_products.forEach((product, idx) => {
    lines.push(
      rowToCsv([
        idx + 1,
        product.product_name,
        product.quantity_sold,
        product.revenue.toFixed(2),
        product.order_count,
      ]),
    );
  });

  return lines.join("\n");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Serialises `AnalyticsData` to CSV and triggers a browser download.
 *
 * @param data      Full analytics payload
 * @param orgSlug   Organisation slug — used in the file name
 * @param dateStr   ISO date string (YYYY-MM-DD) for the file name suffix
 */
export function exportAnalyticsCsv(
  data: AnalyticsData,
  orgSlug: string,
  dateStr: string,
): void {
  const csv = buildCsvContent(data);
  const filename = `verch-analytics-${orgSlug}-${dateStr}.csv`;

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
