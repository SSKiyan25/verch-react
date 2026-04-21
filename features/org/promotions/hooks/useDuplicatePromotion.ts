"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { duplicatePromotionAction } from "../actions/duplicatePromotionAction";

interface UseDuplicatePromotionProps {
  orgId: string;
  onSuccess?: (newPromotionId: string) => void;
}

export function useDuplicatePromotion({
  orgId,
  onSuccess,
}: UseDuplicatePromotionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const duplicate = async (promotionId: string, newName?: string) => {
    setError(null);

    startTransition(async () => {
      const result = await duplicatePromotionAction({
        promotionId,
        orgId,
        new_name: newName ?? null,
      });

      if (result.success) {
        toast.success(
          `Promotion duplicated as "${result.data?.name || "copy"}"`,
        );

        if (onSuccess && result.data?.id) {
          onSuccess(result.data.id);
        } else {
          router.push(`/org/promotions/${result.data?.id}/edit`);
        }

        router.refresh();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  };

  return {
    duplicate,
    isPending,
    error,
    clearError: () => setError(null),
  };
}
