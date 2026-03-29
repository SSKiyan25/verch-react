"use client";

import { Eye, FileText, Download, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useInvoicePreview } from "@/features/org/orders/hooks/useInvoicePreview";
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
  const {
    isModalOpen,
    isLoadingUrl,
    previewUrl,
    error,
    openPreview,
    closePreview,
    downloadInvoice,
  } = useInvoicePreview(orderId);

  // Don't render for: no invoice, or draft (internal)
  if (!invoiceId || !invoiceStatus || invoiceStatus === "draft") return null;

  return (
    <div className="space-y-3">
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
      </div>

      {/* PDF not yet generated */}
      {invoiceStatus === "issued" && !invoicePdfPath && (
        <p className="text-xs text-muted-foreground">
          PDF is being generated...
        </p>
      )}

      {/* Action buttons (when PDF exists) */}
      {invoiceStatus === "issued" && invoicePdfPath && (
        <div className="flex gap-2">
          <Button
            onClick={() => void openPreview(invoicePdfPath)}
            size="sm"
            variant="outline"
            className="flex-1 gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            onClick={() => void downloadInvoice(invoicePdfPath)}
            size="sm"
            variant="outline"
            className="flex-1 gap-2"
            disabled={isLoadingUrl && !isModalOpen}
          >
            {isLoadingUrl && !isModalOpen ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download
              </>
            )}
          </Button>
        </div>
      )}

      {/* Error message (outside modal) */}
      {error && !isModalOpen && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Invoice Preview Modal */}
      <Dialog open={isModalOpen} onOpenChange={closePreview}>
        <DialogContent className="max-w-5xl h-[85vh] md:h-[85vh] w-screen md:w-full md:rounded-lg rounded-none p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-mono text-base">
                {invoiceNumber}
              </DialogTitle>
              <Button
                onClick={closePreview}
                size="icon"
                variant="ghost"
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden px-6 py-4">
            {isLoadingUrl ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    onClick={() => void openPreview(invoicePdfPath!)}
                    size="sm"
                    variant="outline"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="h-full flex flex-col gap-2">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0 rounded-md"
                  title={`Invoice ${invoiceNumber}`}
                />
                <p className="text-xs text-muted-foreground text-center">
                  If the PDF does not load, use the Download button below.
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button
              onClick={() => void downloadInvoice(invoicePdfPath!)}
              variant="outline"
              className="gap-2"
              disabled={isLoadingUrl}
            >
              {isLoadingUrl ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
