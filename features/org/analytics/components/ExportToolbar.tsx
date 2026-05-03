"use client";

// features/org/analytics/components/ExportToolbar.tsx
// Three-button toolbar: CSV, Excel, PDF export.
// Per-button loading state. Pure render — delegates to util functions.

import * as React from "react";
import { DownloadIcon, FileSpreadsheetIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalyticsData } from "../types";
import { exportAnalyticsCsv } from "../utils/exportCsv";
import { exportAnalyticsExcel } from "../utils/exportExcel";
import { exportAnalyticsPdf } from "../utils/exportPdf";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD for file naming. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportToolbarProps {
  data: AnalyticsData | null;
  /** ID of the DOM element to capture for PDF export. Default: "analytics-print-area" */
  printAreaId?: string;
  className?: string;
}

type ExportFormat = "csv" | "excel" | "pdf";

// ─── Component ────────────────────────────────────────────────────────────────

export function ExportToolbar({
  data,
  printAreaId = "analytics-print-area",
  className,
}: ExportToolbarProps) {
  const [loading, setLoading] = React.useState<ExportFormat | null>(null);

  const isDisabled = !data || loading !== null;

  const handleExport = React.useCallback(
    async (format: ExportFormat) => {
      if (!data || loading !== null) return;

      setLoading(format);
      const orgSlug = data.org_slug;
      const dateStr = todayIso();

      try {
        if (format === "csv") {
          exportAnalyticsCsv(data, orgSlug, dateStr);
        } else if (format === "excel") {
          exportAnalyticsExcel(data, orgSlug, dateStr);
        } else if (format === "pdf") {
          await exportAnalyticsPdf(data, orgSlug, dateStr, {
            elementId: printAreaId,
          });
        }
      } catch (err) {
        console.error(`[ExportToolbar] ${format} export failed:`, err);
      } finally {
        setLoading(null);
      }
    },
    [data, loading, printAreaId],
  );

  return (
    <div
      className={cn("flex items-center gap-2 flex-wrap", className)}
      aria-label="Export analytics data"
    >
      {/* CSV */}
      <Button
        variant="outline"
        size="sm"
        disabled={isDisabled}
        onClick={() => handleExport("csv")}
        className="cursor-pointer transition-colors duration-200"
      >
        {loading === "csv" ? (
          <LoadingSpinner />
        ) : (
          <FileTextIcon className="h-4 w-4 mr-1.5 shrink-0" />
        )}
        CSV
      </Button>

      {/* Excel */}
      <Button
        variant="outline"
        size="sm"
        disabled={isDisabled}
        onClick={() => handleExport("excel")}
        className="cursor-pointer transition-colors duration-200"
      >
        {loading === "excel" ? (
          <LoadingSpinner />
        ) : (
          <FileSpreadsheetIcon className="h-4 w-4 mr-1.5 shrink-0" />
        )}
        Excel
      </Button>

      {/* PDF */}
      <Button
        variant="outline"
        size="sm"
        disabled={true} // Temporarily disable PDF export until it's fully tested and stable
        onClick={() => handleExport("pdf")}
        className="cursor-not-allowed transition-colors duration-200"
        title="PDF export is temporarily unavailable"
      >
        {loading === "pdf" ? (
          <LoadingSpinner />
        ) : (
          <DownloadIcon className="h-4 w-4 mr-1.5 shrink-0" />
        )}
        PDF - Temporarily Unavailable
      </Button>
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 mr-1.5 shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
