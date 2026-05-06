"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { OcrStatus } from "../types";

interface PaymentOcrSummaryProps {
  /**
   * Extracted GCash Reference Number (13 digits)
   */
  refNo: string | null;

  /**
   * Extracted payment amount (without currency symbol)
   */
  amount: number | null;

  /**
   * Expected order total amount for mismatch detection
   */
  orderAmount?: number;

  /**
   * OCR confidence score (0-1)
   */
  confidence: number | null;

  /**
   * OCR verification timestamp
   */
  verifiedAt: string | null;

  /**
   * Full raw OCR text for debugging
   */
  rawText?: string | null;

  /**
   * OCR processing status
   */
  ocrStatus: OcrStatus | null;

  /**
   * Whether verification succeeded or failed
   */
  isSuccess: boolean;
}

/**
 * Component: PaymentOcrSummary
 *
 * Displays OCR extraction results including amount, reference number, and confidence.
 * Shows in green card for success, yellow warning for failure.
 * Includes amount mismatch detection and expandable raw text.
 *
 * Usage:
 * ```tsx
 * <PaymentOcrSummary
 *   refNo="1234567890123"
 *   amount={99.00}
 *   orderAmount={99.00}
 *   confidence={0.95}
 *   verifiedAt="2026-05-06T01:19:48.732Z"
 *   ocrStatus="success"
 *   isSuccess={true}
 * />
 * ```
 */
export function PaymentOcrSummary({
  refNo,
  amount,
  orderAmount,
  confidence,
  verifiedAt,
  rawText,
  isSuccess,
}: PaymentOcrSummaryProps) {
  const [showRawText, setShowRawText] = useState(false);

  // Calculate amount mismatch
  const hasMismatch =
    amount !== null &&
    orderAmount !== undefined &&
    Math.abs(amount - orderAmount) > 0.01; // Allow 1 cent tolerance for rounding

  // Determine confidence level
  const confidenceLevel =
    confidence === null
      ? "unknown"
      : confidence >= 0.8
        ? "high"
        : confidence >= 0.5
          ? "medium"
          : "low";

  // Card styling based on success/failure
  const cardClass = isSuccess
    ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
    : "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950";

  const iconClass = isSuccess
    ? "text-green-600 dark:text-green-400"
    : "text-yellow-600 dark:text-yellow-400";

  const textClass = isSuccess
    ? "text-green-900 dark:text-green-100"
    : "text-yellow-900 dark:text-yellow-100";

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {isSuccess ? (
            <CheckCircle2 className={`h-5 w-5 ${iconClass}`} />
          ) : (
            <AlertCircle className={`h-5 w-5 ${iconClass}`} />
          )}
          <span className={textClass}>OCR Extraction Results</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Extracted Amount */}
        {amount !== null && (
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${textClass}`}>
              Extracted Amount:
            </span>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`font-mono text-base ${
                  isSuccess
                    ? "border-green-600 bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100"
                    : "border-yellow-600 bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100"
                }`}
              >
                ₱{amount.toFixed(2)}
              </Badge>
              {hasMismatch && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">
                        Amount differs from order total (₱{orderAmount?.toFixed(2)})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This may be normal if fees were included
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}

        {/* Reference Number */}
        {refNo && (
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${textClass}`}>
              Reference Number:
            </span>
            <Badge
              variant="outline"
              className={`font-mono ${
                isSuccess
                  ? "border-green-600 bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100"
                  : "border-yellow-600 bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100"
              }`}
            >
              {refNo}
            </Badge>
          </div>
        )}

        {/* Confidence Score */}
        {confidence !== null && (
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${textClass}`}>
              Confidence:
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${textClass}`}>
                {Math.round(confidence * 100)}%
              </span>
              {confidenceLevel === "low" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-yellow-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">
                        Low confidence - please verify the data carefully
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}

        {/* Verification Timestamp */}
        {verifiedAt && (
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${textClass}`}>
              Verified At:
            </span>
            <span className={`text-xs ${textClass}`}>
              {new Date(verifiedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}

        {/* Raw OCR Text (Expandable) */}
        {rawText && (
          <div className="space-y-2 border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRawText(!showRawText)}
              className="w-full justify-between text-xs"
            >
              <span className={textClass}>Raw OCR Text</span>
              {showRawText ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
            {showRawText && (
              <div
                className={`max-h-40 overflow-y-auto rounded-md border p-3 text-xs font-mono ${
                  isSuccess
                    ? "border-green-300 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900 dark:text-green-200"
                    : "border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                }`}
              >
                {rawText.length > 500
                  ? `${rawText.substring(0, 500)}... (truncated)`
                  : rawText}
              </div>
            )}
          </div>
        )}

        {/* Missing Data Warning */}
        {!isSuccess && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-100 p-3 dark:border-yellow-800 dark:bg-yellow-900">
            <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              {amount === null && refNo === null
                ? "Could not extract payment details from the screenshot. Please ensure the GCash receipt is clear and complete."
                : refNo === null
                  ? "Reference Number not found. Please upload a screenshot showing the 13-digit Reference Number."
                  : "Please verify the extracted information matches your receipt."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
