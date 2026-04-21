"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { resetPasswordAction } from "@/features/admin/users/actions/resetPasswordAction";

export function useResetPassword() {
  const [isPending, startTransition] = useTransition();

  function resetPassword(userId: string, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await resetPasswordAction({ userId });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Password reset email sent successfully");
      onSuccess?.();
    });
  }

  return { resetPassword, isPending };
}
