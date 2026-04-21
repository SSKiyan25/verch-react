"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { rejectStudentAction } from "@/features/admin/users/actions/rejectStudentAction";

export function useRejectStudent() {
  const [isPending, startTransition] = useTransition();

  function reject(
    studentInfoId: string,
    rejectionReason: string,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      const result = await rejectStudentAction({
        studentInfoId,
        rejectionReason,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Student ID verification rejected");
      onSuccess?.();
    });
  }

  return { reject, isPending };
}
