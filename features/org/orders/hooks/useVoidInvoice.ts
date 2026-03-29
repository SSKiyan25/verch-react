"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { voidInvoiceAction } from "@/features/org/orders/actions/voidInvoiceAction";

export function useVoidInvoice(invoiceId: string) {
  const router = useRouter();
  const [isVoiding, setIsVoiding] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  async function voidInvoice(voidReason: string) {
    setIsVoiding(true);
    try {
      const result = await voidInvoiceAction({ invoiceId, voidReason });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Invoice voided.");
      setIsDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to void invoice",
      );
    } finally {
      setIsVoiding(false);
    }
  }

  return { voidInvoice, isVoiding, isDialogOpen, setIsDialogOpen };
}
