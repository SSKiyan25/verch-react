"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { unsuspendUserAction } from "@/features/admin/users/actions/unsuspendUserAction";

export function useUnsuspendUser() {
  const [isPending, startTransition] = useTransition();

  function unsuspend(userId: string, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await unsuspendUserAction({ userId });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("User account reactivated successfully");
      onSuccess?.();
    });
  }

  return { unsuspend, isPending };
}
