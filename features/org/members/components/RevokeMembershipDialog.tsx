"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

type RevokeMembershipDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  onConfirm: (reason?: string) => void;
  isPending: boolean;
};

export function RevokeMembershipDialog({
  open,
  onOpenChange,
  memberName,
  onConfirm,
  isPending,
}: RevokeMembershipDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    const trimmed = reason.trim();
    onConfirm(trimmed || undefined);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isPending) {
      setReason("");
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Revoke Membership</AlertDialogTitle>
          <AlertDialogDescription>
            This will revoke the membership for {memberName}. They will lose
            access to member benefits.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="revoke-reason">Reason (optional)</Label>
          <Textarea
            id="revoke-reason"
            placeholder="e.g., Graduated, no longer active, violation of rules..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Revoke Membership
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
