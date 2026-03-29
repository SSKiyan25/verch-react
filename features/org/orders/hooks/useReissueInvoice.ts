"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { reissueInvoiceAction } from "@/features/org/orders/actions/reissueInvoiceAction";

export function useReissueInvoice(orderId: string) {
  const router = useRouter();
  const [isReissuing, setIsReissuing] = useState(false);

  async function reissueInvoice() {
    setIsReissuing(true);
    try {
      const result = await reissueInvoiceAction({ orderId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Invoice reissued successfully.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reissue invoice",
      );
    } finally {
      setIsReissuing(false);
    }
  }

  return { reissueInvoice, isReissuing };
}
