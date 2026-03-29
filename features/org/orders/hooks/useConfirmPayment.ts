"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirmPaymentAction } from "@/features/org/orders/actions/confirmPaymentAction";

export function useConfirmPayment(orderId: string) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);

  async function confirmPayment() {
    setIsConfirming(true);
    try {
      const result = await confirmPaymentAction({ orderId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment confirmed. Draft invoice created.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to confirm payment",
      );
    } finally {
      setIsConfirming(false);
    }
  }

  return { confirmPayment, isConfirming };
}
