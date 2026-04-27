"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelOrderAction } from "../actions/cancelOrderAction";

export function useCancelOrder() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const execute = async (orderId: string, reason: string) => {
    setError(null);
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        const result = await cancelOrderAction({ orderId, reason });
        if (!result.success) {
          setError(result.error);
          toast.error("Failed to cancel order", {
            description: result.error,
          });
          // Refresh to revert any optimistic update
          router.refresh();
          reject(new Error(result.error));
        } else {
          toast.success("Order cancelled");
          router.refresh();
          resolve();
        }
      });
    });
  };

  return { execute, isPending, error };
}
