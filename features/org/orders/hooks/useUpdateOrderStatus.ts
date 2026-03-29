"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrderStatusAction } from "@/features/org/orders/actions/updateOrderStatusAction";
import type { OrgOrderDetail } from "@/lib/supabase/queries/org-orders";

type AdvanceableStatus = "confirmed" | "preparing" | "ready";

export function useUpdateOrderStatus(
  orderId: string,
  currentStatus: OrgOrderDetail["status"],
) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  // Derive the next logical status
  const nextStatus = useMemo((): AdvanceableStatus | null => {
    switch (currentStatus) {
      case "confirmed":
        return "preparing";
      case "preparing":
        return "ready";
      case "ready":
        return "ready"; // No further advancement - use completeOrder instead
      default:
        return null;
    }
  }, [currentStatus]);

  const nextStatusLabel = useMemo(() => {
    switch (nextStatus) {
      case "preparing":
        return "Mark as Preparing";
      case "ready":
        return "Mark as Ready";
      default:
        return null;
    }
  }, [nextStatus]);

  async function advanceStatus() {
    if (!nextStatus) return;
    setIsUpdating(true);
    try {
      const result = await updateOrderStatusAction({
        orderId,
        newStatus: nextStatus,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Order status updated to ${nextStatus}.`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return { advanceStatus, nextStatus, nextStatusLabel, isUpdating };
}
