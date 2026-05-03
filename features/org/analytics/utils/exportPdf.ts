// features/org/analytics/utils/exportPdf.ts
// Pure utility — no React imports.
// Captures a DOM element by ID using html2canvas-pro and writes it to a jsPDF document.
// Handles multi-page output when the captured content is taller than one PDF page.
//
// html2canvas-pro is a drop-in fork of html2canvas with native support for oklch(),
// oklab(), and color-mix(in oklab, …) (Tailwind v4) — no onclone workaround needed.

import type { AnalyticsData } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Options passed to the export function. */
export interface ExportPdfOptions {
  /** ID of the DOM element to capture. Defaults to "analytics-print-area". */
  elementId?: string;
  /** Scale factor for html2canvas (higher = sharper, larger file). Default: 2 */
  scale?: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Captures `elementId` with html2canvas, renders it into a jsPDF document,
 * and triggers a browser download.
 *
 * Both `html2canvas` and `jspdf` are dynamically imported so they are only
 * bundled client-side and do not impact server-side rendering.
 *
 * @param data      Full analytics payload (used only for the file name)
 * @param orgSlug   Organisation slug — used in the file name
 * @param dateStr   ISO date string (YYYY-MM-DD) for the file name suffix
 * @param options   Optional overrides for elementId and scale
 */
export async function exportAnalyticsPdf(
  _data: AnalyticsData,
  orgSlug: string,
  dateStr: string,
  options: ExportPdfOptions = {},
): Promise<void> {
  const { elementId = "analytics-print-area", scale = 2 } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(
      `[exportAnalyticsPdf] Element with id="${elementId}" not found in the DOM.`,
    );
  }

  // Dynamic imports — kept client-side only
  const [html2canvasModule, jsPDFModule] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const html2canvas = html2canvasModule.default;
  const { jsPDF } = jsPDFModule;

  // Capture the element — html2canvas-pro natively handles oklch/color-mix (Tailwind v4)
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");

  // A4 dimensions in mm
  const PDF_WIDTH_MM = 210;
  const PDF_HEIGHT_MM = 297;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Scale image to fit the PDF page width while preserving aspect ratio
  const imgWidthMm = PDF_WIDTH_MM;
  const imgHeightMm = (canvas.height * PDF_WIDTH_MM) / canvas.width;

  let remainingHeight = imgHeightMm;
  let positionMm = 0;
  let pageIndex = 0;

  // Slice the image across pages
  while (remainingHeight > 0) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.addImage(
      imgData,
      "PNG",
      0,
      -positionMm, // negative offset shifts to the current slice
      imgWidthMm,
      imgHeightMm,
    );

    positionMm += PDF_HEIGHT_MM;
    remainingHeight -= PDF_HEIGHT_MM;
    pageIndex++;
  }

  const filename = `verch-analytics-${orgSlug}-${dateStr}.pdf`;
  pdf.save(filename);
}
