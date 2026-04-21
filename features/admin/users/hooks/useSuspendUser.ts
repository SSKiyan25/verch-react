"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { suspendUserAction } from "@/features/admin/users/actions/suspendUserAction";

export function useSuspendUser() {
  const [isPending, startTransition] = useTransition();

  function suspend(userId: string, reason: string, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await suspendUserAction({ userId, reason });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("User account suspended successfully");
      onSuccess?.();
    });
  }

  return { suspend, isPending };
}
