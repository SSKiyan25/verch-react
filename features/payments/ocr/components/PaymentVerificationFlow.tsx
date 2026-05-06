"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentUploadForm } from "./PaymentUploadForm";
import { PaymentVerificationStatus } from "./PaymentVerificationStatus";
import type { OcrStatus } from "../types";

interface PaymentVerificationFlowProps {
  orderId: string;
  orderAmount?: number; // Order total amount for mismatch detection
  onPaymentConfirmed?: (refNo: string) => void;
}

/**
 * Component: PaymentVerificationFlow
 *
 * Complete payment verification flow combining upload and status components.
 * Handles the full UX cycle:
 * 1. Upload screenshot
 * 2. Show real-time verification status
 * 3. Allow re-upload if verification fails
 *
 * Usage:
 * ```tsx
 * <PaymentVerificationFlow
 *   orderId="123"
 *   onPaymentConfirmed={(refNo) => router.push('/success')}
 * />
 * ```
 */
export function PaymentVerificationFlow({
  orderId,
  orderAmount,
  onPaymentConfirmed,
}: PaymentVerificationFlowProps) {
  const [showReuploadForm, setShowReuploadForm] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);

  const handleVerified = (refNo: string) => {
    console.log(`[PaymentVerificationFlow] Payment verified: ${refNo}`);
    if (onPaymentConfirmed) {
      onPaymentConfirmed(refNo);
    }
  };

  const handleRejected = (reason: OcrStatus) => {
    console.log(`[PaymentVerificationFlow] Payment rejected: ${reason}`);
    setVerificationAttempts((prev) => prev + 1);
    // Automatically allow re-upload
    setShowReuploadForm(true);
  };

  const handleUploadComplete = () => {
    // Hide re-upload form after successful upload
    setShowReuploadForm(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Verification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Form — Always shown on initial upload or when re-upload requested */}
        <PaymentUploadForm
          orderId={orderId}
          onUploadComplete={handleUploadComplete}
        />

        {/* Verification Status — Real-time updates via Supabase Realtime */}
        <div className="space-y-4">
          <PaymentVerificationStatus
            orderId={orderId}
            orderAmount={orderAmount}
            onVerified={handleVerified}
            onRejected={handleRejected}
          />

          {/* Re-upload suggestion for rejected payments */}
          {verificationAttempts > 0 && showReuploadForm && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
              <p className="mb-2 text-sm font-medium text-orange-900 dark:text-orange-100">
                Tips for a clear GCash receipt screenshot:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-orange-700 dark:text-orange-300">
                <li>Ensure the 13-digit Reference Number is fully visible</li>
                <li>Avoid blurry or cropped images</li>
                <li>Use good lighting to improve text clarity</li>
                <li>
                  Make sure the screenshot is from your GCash app transaction
                  details
                </li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
