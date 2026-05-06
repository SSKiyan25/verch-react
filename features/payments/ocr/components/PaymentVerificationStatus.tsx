"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentVerification } from "../hooks/usePaymentVerification";
import { PaymentOcrSummary } from "./PaymentOcrSummary";
import type { OcrStatus } from "../types";

interface PaymentVerificationStatusProps {
  orderId: string;
  orderAmount?: number; // Order total amount for mismatch detection
  onVerified?: (refNo: string) => void;
  onRejected?: (reason: OcrStatus) => void;
  onVerificationStarted?: () => void;
}

/**
 * Component: PaymentVerificationStatus
 *
 * Displays real-time OCR verification status with automatic updates via Supabase Realtime.
 * Shows:
 * - ⏳ Verifying (blue) — OCR in progress
 * - ✅ Verified (green) — Payment approved with Reference Number
 * - ❌ Rejected (red) — OCR failed with reason
 */
export function PaymentVerificationStatus({
  orderId,
  orderAmount,
  onVerified,
  onRejected,
  onVerificationStarted,
}: PaymentVerificationStatusProps) {
  const {
    paymentStatus,
    ocrStatus,
    gcashRefNo,
    gcashAmount,
    ocrRawText,
    ocrConfidence,
    ocrVerifiedAt,
    loading,
    error: fetchError,
    isTimeout,
    refreshStatus,
  } = usePaymentVerification(orderId);

  // Trigger callbacks when verification completes
  useEffect(() => {
    if (paymentStatus === "confirmed" && gcashRefNo && onVerified) {
      onVerified(gcashRefNo);
    } else if (paymentStatus === "rejected" && ocrStatus && onRejected) {
      onRejected(ocrStatus);
    } else if (
      (paymentStatus === "verifying" || 
       paymentStatus === "proof_submitted" ||
       ocrStatus === "success") && 
      onVerificationStarted
    ) {
      onVerificationStarted();
    }
  }, [paymentStatus, gcashRefNo, ocrStatus, onVerified, onRejected, onVerificationStarted]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  // Fetch error
  if (fetchError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{fetchError}</AlertDescription>
      </Alert>
    );
  }

  // Status: Verifying (OCR in progress)
  if (paymentStatus === "verifying") {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <div className="space-y-2">
            <p className="font-medium">
              {isTimeout
                ? "Verification is taking longer than expected..."
                : "Processing your payment screenshot..."}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {isTimeout
                ? "This is unusual. The verification may still complete, or you can try refreshing the status."
                : "Our system is automatically verifying your GCash payment. This usually takes 10-30 seconds."}
            </p>
            {isTimeout && (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshStatus}
                disabled={loading}
                className="mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  "Refresh Status"
                )}
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Status: Verified (Success) - OCR completed successfully or manually confirmed
  // Show success when:
  // 1. Payment status is "proof_submitted" or "confirmed" (regardless of gcashRefNo)
  // 2. OCR status is "success"
  if (
    paymentStatus === "proof_submitted" ||
    paymentStatus === "confirmed" ||
    ocrStatus === "success"
  ) {
    return (
      <div className="space-y-3">
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900 dark:text-green-100">
            <p className="font-medium">Payment Verified Successfully!</p>
          </AlertDescription>
        </Alert>
        {(gcashRefNo || gcashAmount || ocrVerifiedAt) && (
          <PaymentOcrSummary
            refNo={gcashRefNo}
            amount={gcashAmount}
            orderAmount={orderAmount}
            confidence={ocrConfidence}
            verifiedAt={ocrVerifiedAt}
            rawText={ocrRawText}
            ocrStatus={ocrStatus}
            isSuccess={true}
          />
        )}
      </div>
    );
  }

  // Status: Rejected (OCR failed)
  if (paymentStatus === "rejected") {
    const errorMessage = getErrorMessage(ocrStatus);
    const isRetryable = ocrStatus === "no_ref_found" || ocrStatus === "api_error" || ocrStatus === "invalid_format";
    const needsSupport = ocrStatus === "duplicate_ref" || ocrStatus === "amount_mismatch";

    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Payment Verification Failed</p>
              <p className="text-sm">{errorMessage}</p>
              {isRetryable && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                  <p className="text-xs font-medium text-red-900 dark:text-red-100">
                    Tips for a successful upload:
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-red-700 dark:text-red-300">
                    <li>Take a clear, well-lit photo of your entire GCash receipt</li>
                    <li>Ensure the 13-digit Reference Number is fully visible</li>
                    <li>Avoid blurry, cropped, or dark images</li>
                    <li>Use your phone&apos;s camera app for best quality</li>
                  </ul>
                </div>
              )}
              {needsSupport && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                    Need help? Contact support with your order number and transaction details.
                  </p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
        {ocrVerifiedAt && (
          <PaymentOcrSummary
            refNo={gcashRefNo}
            amount={gcashAmount}
            orderAmount={orderAmount}
            confidence={ocrConfidence}
            verifiedAt={ocrVerifiedAt}
            rawText={ocrRawText}
            ocrStatus={ocrStatus}
            isSuccess={false}
          />
        )}
      </div>
    );
  }

  // Status: Pending (waiting for upload)
  return (
    <Alert className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
      <AlertCircle className="h-4 w-4 text-gray-600" />
      <AlertDescription className="text-gray-900 dark:text-gray-100">
        <p className="text-sm">
          Upload your GCash payment screenshot to verify your payment.
        </p>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Maps OCR status codes to user-friendly error messages with actionable guidance
 */
function getErrorMessage(ocrStatus: OcrStatus | null): string {
  switch (ocrStatus) {
    case "no_ref_found":
      return "No GCash Reference Number detected in your screenshot. Please retake the photo ensuring the 13-digit Reference Number (Ref No.) is clearly visible and well-lit.";
    case "invalid_format":
      return "Invalid Reference Number format detected. GCash Reference Numbers must be exactly 13 digits. Please verify you uploaded a GCash receipt and not a different payment screenshot.";
    case "duplicate_ref":
      return "This Reference Number has already been used for another order. Each payment must have a unique reference number. If you believe this is an error, please contact support with your transaction details.";
    case "amount_mismatch":
      return "The amount shown in your GCash receipt doesn't match the order total. Please verify you sent the correct amount and upload the matching receipt. Contact support if you need assistance.";
    case "api_error":
      return "Verification service is temporarily unavailable. This is usually a brief issue. Please wait 30 seconds and try uploading your screenshot again.";
    default:
      return "Payment verification failed. Please ensure your screenshot is clear, well-lit, and shows the complete GCash receipt with the Reference Number visible.";
  }
}
