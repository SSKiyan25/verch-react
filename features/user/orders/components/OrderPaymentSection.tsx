"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Banknote,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  XCircle,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrgGCashSettingsAction } from "@/features/user/orders/actions/getOrgGCashSettingsAction";
import { usePaymentRealtime } from "@/features/user/orders/hooks/usePaymentRealtime";
import { createClient } from "@/lib/supabase/client";
import type { OrderDetail } from "@/lib/supabase/queries/orders";
import Image from "next/image";
import { PaymentScreenshotPreview } from "@/features/payments/ocr/components/PaymentScreenshotPreview";
import { getPaymentProofPreviewUrl } from "@/features/payments/ocr/actions/getPaymentProofPreviewUrl";

interface OrderPaymentSectionProps {
  order: OrderDetail;
}

type GCashSettings = {
  number: string;
  accountName: string;
  qrImagePath: string | null;
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Awaiting Payment",
  verifying: "Verifying Payment",
  proof_submitted: "Proof Submitted",
  confirmed: "Payment Confirmed",
  rejected: "Payment Rejected",
};

const OCR_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "destructive";
    icon: typeof CheckCircle2;
    className?: string;
  }
> = {
  success: {
    label: "Verified Successfully",
    variant: "default",
    icon: CheckCircle2,
    className:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  },
  no_ref_found: {
    label: "Reference Number Not Found",
    variant: "destructive",
    icon: XCircle,
  },
  invalid_format: {
    label: "Invalid Reference Number Format",
    variant: "destructive",
    icon: XCircle,
  },
  duplicate_ref: {
    label: "Duplicate Reference Number",
    variant: "destructive",
    icon: XCircle,
  },
  amount_mismatch: {
    label: "Amount Mismatch",
    variant: "destructive",
    icon: XCircle,
  },
  api_error: {
    label: "OCR Processing Error",
    variant: "destructive",
    icon: XCircle,
  },
};

export function OrderPaymentSection({ order }: OrderPaymentSectionProps) {
  const router = useRouter();
  const {
    payment_method,
    payment_status,
    // proof_path,
    proof_amount,
    proof_reference_code,
    rejection_note,
  } = order;
  const [gcashSettings, setGcashSettings] = useState<GCashSettings | null>(
    null,
  );
  const supabase = createClient();

  // Preview modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Real-time payment updates
  const { paymentData, isLoading: isPaymentLoading } = usePaymentRealtime(
    order.order_id,
  );

  useEffect(() => {
    if (payment_method !== "gcash") return;
    getOrgGCashSettingsAction(order.organization_id).then((result) => {
      if (result.success) setGcashSettings(result.gcash);
    });
  }, [order.organization_id, payment_method]);

  const needsPayment =
    payment_method === "gcash" &&
    (payment_status === "pending" || payment_status === "rejected");

  const hasUploadedProof =
    payment_method === "gcash" &&
    (payment_status === "proof_submitted" ||
      payment_status === "confirmed" ||
      payment_status === "rejected");

  const handlePreviewClick = async () => {
    setIsLoadingPreview(true);
    try {
      const result = await getPaymentProofPreviewUrl(order.order_id);

      if (result.success) {
        setPreviewUrl(result.url);
        setIsPreviewOpen(true);
      } else {
        toast.error("Preview unavailable", {
          description: result.error,
        });
      }
    } catch {
      toast.error("Preview failed", {
        description: "An unexpected error occurred",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Payment method + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {payment_method === "cash" ? (
            <Banknote className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="capitalize font-medium">
            {payment_method === "cash" ? "Cash on Pickup" : "GCash"}
          </span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {PAYMENT_STATUS_LABELS[payment_status]}
        </Badge>
      </div>

      {/* GCash payment details */}
      {payment_method === "gcash" && gcashSettings && needsPayment && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h4 className="font-medium text-sm">Send payment to:</h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Account Name</p>
                <p className="font-medium">{gcashSettings.accountName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">GCash Number</p>
                <p className="font-medium">{gcashSettings.number}</p>
              </div>
            </div>
            {gcashSettings.qrImagePath && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">QR Code</p>
                <Image
                  src={
                    supabase.storage
                      .from("org-gcash-qr")
                      .getPublicUrl(gcashSettings.qrImagePath).data.publicUrl
                  }
                  alt="GCash QR code"
                  width={200}
                  height={200}
                  className="rounded-lg border"
                />
              </div>
            )}
            <Button
              onClick={() => router.push(`/user/payment/${order.order_id}`)}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {payment_status === "rejected"
                ? "Re-submit Payment Proof"
                : "Submit Payment Proof"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rejection note */}
      {payment_status === "rejected" && rejection_note && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Payment rejected: </span>
            {rejection_note}
          </AlertDescription>
        </Alert>
      )}

      {/* Awaiting review */}
      {payment_status === "proof_submitted" && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="font-medium">Proof Submitted</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your payment proof has been submitted. Waiting for the store to
              review.
            </p>
            {(proof_amount != null || proof_reference_code) && (
              <div className="pt-2 space-y-2 border-t">
                {proof_amount != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Amount Paid</p>
                    <p className="font-medium tabular-nums">
                      ₱
                      {proof_amount.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}
                {proof_reference_code && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Reference Code
                    </p>
                    <p className="font-medium font-mono text-sm">
                      {proof_reference_code}
                    </p>
                  </div>
                )}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewClick}
              disabled={isLoadingPreview}
              className="w-full mt-2"
            >
              {isLoadingPreview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Preview...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Uploaded Screenshot
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment confirmed */}
      {payment_status === "confirmed" && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="font-medium">Payment Confirmed</span>
            </div>
            {(proof_amount != null || proof_reference_code) && (
              <div className="pt-2 space-y-2 border-t">
                {proof_amount != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Amount Paid</p>
                    <p className="font-medium tabular-nums">
                      ₱
                      {proof_amount.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}
                {proof_reference_code && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Reference Code
                    </p>
                    <p className="font-medium font-mono text-sm">
                      {proof_reference_code}
                    </p>
                  </div>
                )}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewClick}
              disabled={isLoadingPreview}
              className="w-full mt-2"
            >
              {isLoadingPreview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Preview...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Uploaded Screenshot
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* OCR Verification - Processing State */}
      {payment_method === "gcash" &&
        paymentData?.status === "verifying" &&
        !isPaymentLoading && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  Processing your payment screenshot...
                </span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Our system is automatically verifying your GCash payment. This
                usually takes 10-30 seconds.
              </p>
            </CardContent>
          </Card>
        )}

      {/* OCR Verification Results */}
      {payment_method === "gcash" &&
        paymentData &&
        paymentData.ocr_verified_at &&
        paymentData.status !== "pending" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Payment Verification Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* OCR Status Badge */}
              {paymentData.ocr_status &&
                OCR_STATUS_CONFIG[paymentData.ocr_status] && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Status:</p>
                    <Badge
                      variant={
                        OCR_STATUS_CONFIG[paymentData.ocr_status].variant
                      }
                      className={
                        OCR_STATUS_CONFIG[paymentData.ocr_status].className
                      }
                    >
                      {(() => {
                        const Icon =
                          OCR_STATUS_CONFIG[paymentData.ocr_status].icon;
                        return <Icon className="h-3.5 w-3.5 mr-1" />;
                      })()}
                      {OCR_STATUS_CONFIG[paymentData.ocr_status].label}
                    </Badge>
                  </div>
                )}

              {/* Amount Mismatch Alert */}
              {paymentData.ocr_status === "amount_mismatch" &&
                paymentData.gcash_amount !== null && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <span className="font-medium">Amount mismatch: </span>
                      Extracted amount ₱
                      {paymentData.gcash_amount.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      does not match order total ₱
                      {paymentData.amount.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      . Please upload the correct payment screenshot.
                    </AlertDescription>
                  </Alert>
                )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Reference Number */}
                {paymentData.gcash_ref_no && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      GCash Reference Number
                    </p>
                    <p className="font-mono text-lg font-bold text-foreground">
                      {paymentData.gcash_ref_no}
                    </p>
                  </div>
                )}

                {/* Extracted Amount */}
                {paymentData.gcash_amount !== null && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Extracted Amount
                    </p>
                    <p className="font-semibold text-lg tabular-nums">
                      ₱
                      {paymentData.gcash_amount.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}

                {/* Verified At */}
                {paymentData.ocr_verified_at && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Verified At
                    </p>
                    <p className="text-sm font-medium">
                      {format(
                        new Date(paymentData.ocr_verified_at),
                        "MMM d, yyyy 'at' h:mm a",
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Raw OCR Text (Collapsible) */}
              {paymentData.ocr_raw_text && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="raw-text" className="border-0">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline">
                      View Raw OCR Text
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-md bg-muted p-3 mt-2">
                        <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                          {paymentData.ocr_raw_text}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
          </Card>
        )}

      {/* Loading Skeleton for Real-time Data */}
      {isPaymentLoading && payment_method === "gcash" && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      {hasUploadedProof && (
        <PaymentScreenshotPreview
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          proofUrl={previewUrl}
        />
      )}
    </div>
  );
}
