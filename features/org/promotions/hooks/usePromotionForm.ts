"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPromotionAction } from "../actions/createPromotionAction";
import { updatePromotionAction } from "../actions/updatePromotionAction";
import type {
  CreatePromotionInput,
  UpdatePromotionInput,
} from "../schemas/promotionSchemas";

interface UsePromotionFormProps {
  orgId: string;
  promotionId?: string;
  mode: "create" | "edit";
  onSuccess?: (promotionId: string) => void;
}

export function usePromotionForm({
  orgId,
  promotionId,
  mode,
  onSuccess,
}: UsePromotionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (data: CreatePromotionInput) => {
    setError(null);

    startTransition(async () => {
      const result = await createPromotionAction({ ...data, orgId });

      if (result.success) {
        toast.success(`Promotion "${result.data?.name}" created successfully`);

        if (onSuccess && result.data?.id) {
          onSuccess(result.data.id);
        } else {
          router.push("/org/promotions");
        }

        router.refresh();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  };

  const handleUpdate = async (data: UpdatePromotionInput) => {
    if (!promotionId) {
      toast.error("Promotion ID is required for updates");
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await updatePromotionAction({
        ...data,
        promotionId,
        orgId,
      });

      if (result.success) {
        toast.success(`Promotion "${result.data?.name}" updated successfully`);

        if (onSuccess && result.data?.id) {
          onSuccess(result.data.id);
        } else {
          router.push("/org/promotions");
        }

        router.refresh();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  };

  const handleSubmit = mode === "create" ? handleCreate : handleUpdate;

  return {
    handleSubmit,
    isPending,
    error,
    clearError: () => setError(null),
  };
}
