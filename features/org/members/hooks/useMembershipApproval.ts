"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approveMembershipAction } from "@/features/org/members/actions/approveMembershipAction";
import { rejectMembershipAction } from "@/features/org/members/actions/rejectMembershipAction";
import { revokeMembershipAction } from "@/features/org/members/actions/revokeMembershipAction";

export function useMembershipApproval() {
  const [isPending, startTransition] = useTransition();

  // Dialog state for reject action
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    membershipId: string | null;
  }>({
    open: false,
    membershipId: null,
  });

  // Dialog state for revoke action
  const [revokeDialog, setRevokeDialog] = useState<{
    open: boolean;
    membershipId: string | null;
  }>({
    open: false,
    membershipId: null,
  });

  function approve(
    membershipId: string,
    position?: string,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      const result = await approveMembershipAction({ membershipId, position });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Membership approved");
      onSuccess?.();
    });
  }

  function reject(
    membershipId: string,
    rejectionReason: string,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      const result = await rejectMembershipAction({
        membershipId,
        rejectionReason,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Membership rejected");
      setRejectDialog({ open: false, membershipId: null });
      onSuccess?.();
    });
  }

  function revoke(
    membershipId: string,
    reason?: string,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      const result = await revokeMembershipAction({ membershipId, reason });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Membership revoked");
      setRevokeDialog({ open: false, membershipId: null });
      onSuccess?.();
    });
  }

  return {
    isPending,
    approve,
    reject,
    revoke,
    rejectDialog,
    setRejectDialog,
    revokeDialog,
    setRevokeDialog,
  };
}
