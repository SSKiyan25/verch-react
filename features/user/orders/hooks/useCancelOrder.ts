"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelOrderAction } from "@/features/user/orders/actions/cancelOrderAction";

interface UseCancelOrderProps {
  orderId: string;
}

interface UseCancelOrderReturn {
  reason: string;
  setReason: (r: string) => void;
  isCancelling: boolean;
  error: string | null;
  cancel: () => Promise<void>;
}

export function useCancelOrder({
  orderId,
}: UseCancelOrderProps): UseCancelOrderReturn {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    setIsCancelling(true);
    setError(null);
    try {
      const result = await cancelOrderAction({
        orderId,
        cancellationReason: reason.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast.success("Order cancelled successfully");
      router.push("/user/orders");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return { reason, setReason, isCancelling, error, cancel };
}
