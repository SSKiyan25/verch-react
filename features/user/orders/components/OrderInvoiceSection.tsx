"use client";

import { useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInvoiceUrlAction } from "@/features/user/orders/actions/getInvoiceUrlAction";
import type { InvoiceStatus } from "@/lib/supabase/queries/orders";

interface OrderInvoiceSectionProps {
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: InvoiceStatus | null;
  invoicePdfPath: string | null;
  orderId: string;
}

export function OrderInvoiceSection({
  invoiceId,
  invoiceNumber,
  invoiceStatus,
  invoicePdfPath,
  orderId,
}: OrderInvoiceSectionProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Don't render for: no invoice, or draft (internal)
  if (!invoiceId || !invoiceStatus || invoiceStatus === "draft") return null;

  const handleDownload = async () => {
    if (!invoicePdfPath) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const result = await getInvoiceUrlAction({
        invoicePdfPath,
        orderId,
      });
      if (!result.success) {
        setDownloadError(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch {
      setDownloadError("Failed to get invoice URL");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Invoice</p>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span
            className={`text-sm font-mono ${invoiceStatus === "void" ? "line-through text-muted-foreground" : ""}`}
          >
            {invoiceNumber ?? "—"}
          </span>
          {invoiceStatus === "issued" && (
            <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 text-xs">
              Issued
            </Badge>
          )}
          {invoiceStatus === "void" && (
            <Badge variant="destructive" className="text-xs">
              Voided
            </Badge>
          )}
        </div>

        {invoiceStatus === "issued" && invoicePdfPath && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleDownload()}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-1.5" />
                Download
              </>
            )}
          </Button>
        )}
      </div>

      {downloadError && (
        <p className="text-xs text-destructive">{downloadError}</p>
      )}
    </div>
  );
}
