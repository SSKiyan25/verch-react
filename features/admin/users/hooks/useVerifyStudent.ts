"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { verifyStudentAction } from "@/features/admin/users/actions/verifyStudentAction";

export function useVerifyStudent() {
  const [isPending, startTransition] = useTransition();

  function verify(studentInfoId: string, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await verifyStudentAction({ studentInfoId });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Student ID verified successfully");
      onSuccess?.();
    });
  }

  return { verify, isPending };
}
