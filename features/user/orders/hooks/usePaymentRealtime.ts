/**
 * Real-time Payment Updates Hook
 *
 * Subscribes to real-time updates for a specific order's payment record.
 * Automatically fetches initial payment data and listens for updates via
 * Supabase Realtime.
 *
 * Use this hook to display live OCR verification results without page refresh.
 *
 * @example
 * ```tsx
 * const { paymentData, isLoading, error } = usePaymentRealtime(orderId);
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <Alert>Error: {error}</Alert>;
 * if (paymentData?.ocr_status === 'success') {
 *   // Show OCR results...
 * }
 * ```
 */

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PaymentData {
  id: string;
  order_id: string;
  method: "cash" | "gcash";
  status: "pending" | "proof_submitted" | "confirmed" | "rejected" | "verifying";
  amount: number;
  proof_url: string | null;
  proof_path: string | null;
  proof_amount: number | null;
  proof_reference_code: string | null;
  rejection_note: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  // GCash OCR fields
  gcash_ref_no: string | null;
  gcash_amount: number | null;
  ocr_status: string | null;
  ocr_raw_text: string | null;
  ocr_confidence: number | null;
  ocr_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsePaymentRealtimeReturn {
  paymentData: PaymentData | null;
  isLoading: boolean;
  error: string | null;
}

export function usePaymentRealtime(orderId: string): UsePaymentRealtimeReturn {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    async function fetchInitialData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch initial payment data
        const { data, error: fetchError } = await supabase
          .from("order_payments")
          .select("*")
          .eq("order_id", orderId)
          .single();

        if (fetchError) {
          console.error(`[usePaymentRealtime] Fetch error:`, fetchError);
          setError(fetchError.message);
          setIsLoading(false);
          return;
        }

        setPaymentData(data as PaymentData);
        setIsLoading(false);

        // Set up real-time subscription
        channel = supabase
          .channel(`payment-${orderId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "order_payments",
              filter: `order_id=eq.${orderId}`,
            },
            (payload) => {
              console.log(
                `[usePaymentRealtime] Received update for order ${orderId}:`,
                payload,
              );
              setPaymentData(payload.new as PaymentData);
            },
          )
          .subscribe((status) => {
            console.log(
              `[usePaymentRealtime] Subscription status for order ${orderId}:`,
              status,
            );
          });
      } catch (err) {
        console.error(`[usePaymentRealtime] Unexpected error:`, err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsLoading(false);
      }
    }

    void fetchInitialData();

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        console.log(
          `[usePaymentRealtime] Unsubscribing from payment updates for order ${orderId}`,
        );
        void supabase.removeChannel(channel);
      }
    };
  }, [orderId]);

  return { paymentData, isLoading, error };
}
