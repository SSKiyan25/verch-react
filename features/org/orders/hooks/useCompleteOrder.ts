"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { completeOrderAction } from "@/features/org/orders/actions/completeOrderAction";

export function useCompleteOrder(orderId: string) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

  async function completeOrder() {
    setIsCompleting(true);
    try {
      const result = await completeOrderAction({ orderId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Order completed. Final invoice issued.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to complete order",
      );
    } finally {
      setIsCompleting(false);
    }
  }

  return { completeOrder, isCompleting };
}
