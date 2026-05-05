"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OcrStatus, PaymentRowUpdate } from "../types";

/**
 * Hook: usePaymentVerification
 * 
 * Subscribes to Supabase Realtime updates for a specific order payment.
 * Updates UI automatically when Cloud Function writes OCR results.
 * 
 * @param orderId - The order ID to monitor
 * @returns Payment verification state with loading flag
 */
export function usePaymentVerification(orderId: string) {
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "proof_submitted" | "confirmed" | "rejected" | "verifying"
  >("pending");
  const [ocrStatus, setOcrStatus] = useState<OcrStatus | null>(null);
  const [gcashRefNo, setGcashRefNo] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [ocrVerifiedAt, setOcrVerifiedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    const fetchInitialState = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("order_payments")
          .select(
            "status, gcash_ref_no, ocr_status, ocr_confidence, ocr_verified_at"
          )
          .eq("order_id", orderId)
          .maybeSingle();

        if (fetchError) {
          console.error("[usePaymentVerification] Fetch error:", fetchError);
          setError("Failed to load payment status");
          setLoading(false);
          return;
        }

        if (data) {
          setPaymentStatus(data.status);
          setOcrStatus(data.ocr_status as OcrStatus | null);
          setGcashRefNo(data.gcash_ref_no);
          setOcrConfidence(data.ocr_confidence);
          setOcrVerifiedAt(data.ocr_verified_at);
        }
        // If no data, just remain in 'pending' state (default)

        setLoading(false);
      } catch (err) {
        console.error("[usePaymentVerification] Exception:", err);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    fetchInitialState();

    // Subscribe to Realtime updates
    const channel = supabase
      .channel(`payment-verification-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "order_payments",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          console.log("[usePaymentVerification] Realtime update:", payload);

          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const newData = payload.new as PaymentRowUpdate;

            setPaymentStatus(newData.status);
            setOcrStatus(newData.ocr_status as OcrStatus | null);
            setGcashRefNo(newData.gcash_ref_no);
            setOcrConfidence(newData.ocr_confidence);
            setOcrVerifiedAt(newData.ocr_verified_at);
            setLoading(false);
            setError(null); // Clear any previous errors
          }
        }
      )
      .subscribe((status) => {
        console.log("[usePaymentVerification] Subscription status:", status);
        
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError("Real-time updates unavailable");
        }
      });

    // Cleanup on unmount
    return () => {
      console.log("[usePaymentVerification] Unsubscribing from channel");
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return {
    paymentStatus,
    ocrStatus,
    gcashRefNo,
    ocrConfidence,
    ocrVerifiedAt,
    loading,
    error,
  };
}
