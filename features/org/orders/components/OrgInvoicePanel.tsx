"use client";

import {
  Eye,
  Download,
  FileText,
  Ban,
  RefreshCw,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useVoidInvoice } from "@/features/org/orders/hooks/useVoidInvoice";
import { useReissueInvoice } from "@/features/org/orders/hooks/useReissueInvoice";
import { useInvoicePreview } from "@/features/org/orders/hooks/useInvoicePreview";
import { VoidInvoiceDialog } from "@/features/org/orders/components/VoidInvoiceDialog";
import type { OrgOrderDetail } from "@/lib/supabase/queries/org-orders";

type Props = {
  order: OrgOrderDetail;
  userRole: string;
};

export function OrgInvoicePanel({ order, userRole }: Props) {
  const { isDialogOpen, setIsDialogOpen } = useVoidInvoice(
    order.invoice_id ?? "",
  );
  const { reissueInvoice, isReissuing } = useReissueInvoice(order.id);
  const {
    isModalOpen,
    isLoadingUrl,
    previewUrl,
    error: previewError,
    openPreview,
    closePreview,
    downloadInvoice,
  } = useInvoicePreview(order.id);

  const canManageInvoice = [
    "organization_admin",
    "organization_manager",
  ].includes(userRole);

  // No invoice yet
  if (!order.invoice_id) {
    return (
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold">Invoice</h3>
        <p className="text-sm text-muted-foreground">
          No invoice yet. Confirm payment to generate a draft invoice.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h3 className="font-semibold">Invoice</h3>

      <div className="space-y-3">
        {/* Invoice status badge */}
        <div>
          {order.invoice_status === "draft" && (
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              Draft
            </Badge>
          )}
          {order.invoice_status === "issued" && (
            <Badge
              variant="outline"
              className="gap-1 bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400"
            >
              <FileText className="h-3 w-3" />
              Issued
            </Badge>
          )}
          {order.invoice_status === "void" && (
            <Badge
              variant="outline"
              className="gap-1 bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400"
            >
              <Ban className="h-3 w-3" />
              Voided
            </Badge>
          )}
        </div>

        {/* Invoice number */}
        {order.invoice_number && (
          <div className="text-sm">
            <span className="text-muted-foreground">Invoice #: </span>
            <span className="font-mono font-medium">
              {order.invoice_number}
            </span>
          </div>
        )}

        {/* PDF not yet generated */}
        {!order.invoice_pdf_path && (
          <p className="text-xs text-muted-foreground">
            PDF is being generated...
          </p>
        )}

        {/* Draft status message */}
        {order.invoice_status === "draft" && order.invoice_pdf_path && (
          <p className="text-xs text-muted-foreground">
            Draft invoice generated. Final invoice will be issued when order is
            completed.
          </p>
        )}

        {/* Action buttons (when PDF exists) */}
        {order.invoice_pdf_path && (
          <div className="flex gap-2">
            <Button
              onClick={() => void openPreview(order.invoice_pdf_path!)}
              size="sm"
              variant="outline"
              className="flex-1 gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview Invoice
            </Button>
            {order.invoice_status === "issued" && (
              <Button
                onClick={() => void downloadInvoice(order.invoice_pdf_path!)}
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
            )}
          </div>
        )}

        {/* Preview error (outside modal) */}
        {previewError && !isModalOpen && (
          <p className="text-xs text-destructive">{previewError}</p>
        )}

        {/* Void button (issued invoices only) */}
        {order.invoice_status === "issued" && canManageInvoice && (
          <Button
            onClick={() => setIsDialogOpen(true)}
            size="sm"
            variant="destructive"
            className="w-full gap-2"
          >
            <Ban className="h-4 w-4" />
            Void Invoice
          </Button>
        )}

        {/* Reissue button (voided invoices only) */}
        {order.invoice_status === "void" && canManageInvoice && (
          <div className="space-y-2">
            <Button
              onClick={reissueInvoice}
              disabled={isReissuing}
              size="sm"
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {isReissuing ? "Reissuing..." : "Reissue Invoice"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Creates a new invoice with a new number.
            </p>
          </div>
        )}
      </div>

      {order.invoice_id && (
        <VoidInvoiceDialog
          invoiceId={order.invoice_id}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      )}

      {/* Invoice Preview Modal */}
      <Dialog open={isModalOpen} onOpenChange={closePreview}>
        <DialogContent className="max-w-5xl h-[55vh] md:h-[55vh] w-screen md:w-full md:rounded-lg rounded-none p-0 gap-0">
          <DialogHeader className="px-6 py-8 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-mono text-base">
                {order.invoice_number}
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
            ) : previewError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <p className="text-sm text-destructive">{previewError}</p>
                  <Button
                    onClick={() => void openPreview(order.invoice_pdf_path!)}
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
                  title={`Invoice ${order.invoice_number}`}
                />
                <p className="text-xs text-muted-foreground text-center">
                  If the PDF does not load, use the Download button below.
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button
              onClick={() => void downloadInvoice(order.invoice_pdf_path!)}
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
