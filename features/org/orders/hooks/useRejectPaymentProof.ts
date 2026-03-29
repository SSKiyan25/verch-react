"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { rejectPaymentProofAction } from "@/features/org/orders/actions/rejectPaymentProofAction";

export function useRejectPaymentProof(orderId: string) {
  const router = useRouter();
  const [isRejecting, setIsRejecting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  async function rejectProof(rejectionNote: string) {
    setIsRejecting(true);
    try {
      const result = await rejectPaymentProofAction({
        orderId,
        rejectionNote,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment proof rejected.");
      setIsDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject proof",
      );
    } finally {
      setIsRejecting(false);
    }
  }

  return { rejectProof, isRejecting, isDialogOpen, setIsDialogOpen };
}
