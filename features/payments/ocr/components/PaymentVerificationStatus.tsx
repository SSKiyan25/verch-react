"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentVerification } from "../hooks/usePaymentVerification";
import type { OcrStatus } from "../types";

interface PaymentVerificationStatusProps {
  orderId: string;
  onVerified?: (refNo: string) => void;
  onRejected?: (reason: OcrStatus) => void;
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
  onVerified,
  onRejected,
}: PaymentVerificationStatusProps) {
  const {
    paymentStatus,
    ocrStatus,
    gcashRefNo,
    ocrConfidence,
    loading,
    error: fetchError,
  } = usePaymentVerification(orderId);

  // Trigger callbacks when verification completes
  useEffect(() => {
    if (paymentStatus === "confirmed" && gcashRefNo && onVerified) {
      onVerified(gcashRefNo);
    } else if (paymentStatus === "rejected" && ocrStatus && onRejected) {
      onRejected(ocrStatus);
    }
  }, [paymentStatus, gcashRefNo, ocrStatus, onVerified, onRejected]);

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
  if (paymentStatus === "verifying" || paymentStatus === "proof_submitted") {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <div className="space-y-2">
            <p className="font-medium">Verifying your payment screenshot...</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This usually takes 10-30 seconds. Please don&apos;t close this
              page.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Status: Verified (Success)
  if (paymentStatus === "confirmed" && gcashRefNo) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-900 dark:text-green-100">
          <div className="space-y-3">
            <p className="font-medium">Payment Verified Successfully!</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-700 dark:text-green-300">
                GCash Reference Number:
              </span>
              <Badge
                variant="outline"
                className="border-green-600 bg-green-100 font-mono text-green-900 dark:bg-green-900 dark:text-green-100"
              >
                {gcashRefNo}
              </Badge>
            </div>
            {ocrConfidence && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Confidence: {Math.round(ocrConfidence * 100)}%
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Status: Rejected (OCR failed)
  if (paymentStatus === "rejected") {
    const errorMessage = getErrorMessage(ocrStatus);

    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Payment Verification Failed</p>
            <p className="text-sm">{errorMessage}</p>
            <p className="text-xs text-muted-foreground">
              Please upload a clear screenshot of your GCash receipt with the
              Reference Number visible.
            </p>
          </div>
        </AlertDescription>
      </Alert>
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
 * Maps OCR status codes to user-friendly error messages
 */
function getErrorMessage(ocrStatus: OcrStatus | null): string {
  switch (ocrStatus) {
    case "no_ref_found":
      return "No GCash Reference Number detected in the image. Please ensure your screenshot shows the 13-digit Reference Number clearly.";
    case "invalid_format":
      return "Invalid Reference Number format detected. GCash Reference Numbers must be exactly 13 digits.";
    case "duplicate_ref":
      return "This Reference Number has already been used for another payment. Please check your receipt or contact support if you believe this is an error.";
    case "api_error":
      return "Verification service temporarily unavailable. Please try uploading again in a few moments.";
    default:
      return "Payment verification failed. Please ensure your screenshot is clear and shows the complete GCash receipt.";
  }
}
