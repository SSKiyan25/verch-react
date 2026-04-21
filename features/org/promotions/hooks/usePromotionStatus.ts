"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePromotionStatusAction } from "../actions/updatePromotionStatusAction";
import type { PromotionStatus } from "@/lib/types/org-promotions";

interface UsePromotionStatusProps {
  orgId: string;
  promotionId: string;
  currentStatus: PromotionStatus;
  promotionName: string;
}

export function usePromotionStatus({
  orgId,
  promotionId,
  currentStatus,
  promotionName,
}: UsePromotionStatusProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canActivate = currentStatus === "draft" || currentStatus === "paused";
  const canPause = currentStatus === "active";

  const activate = async () => {
    if (!canActivate) {
      toast.error("Cannot activate promotion in current status");
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await updatePromotionStatusAction({
        promotionId,
        orgId,
        new_status: "active",
      });

      if (result.success) {
        toast.success(`Promotion "${promotionName}" activated`);
        router.refresh();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  };

  const pause = async () => {
    if (!canPause) {
      toast.error("Can only pause active promotions");
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await updatePromotionStatusAction({
        promotionId,
        orgId,
        new_status: "paused",
      });

      if (result.success) {
        toast.success(`Promotion "${promotionName}" paused`);
        router.refresh();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  };

  return {
    activate,
    pause,
    canActivate,
    canPause,
    isPending,
    error,
    clearError: () => setError(null),
  };
}
