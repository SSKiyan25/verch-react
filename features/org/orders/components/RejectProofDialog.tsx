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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRejectPaymentProof } from "@/features/org/orders/hooks/useRejectPaymentProof";

type Props = {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
};

export function RejectProofDialog({ orderId, isOpen, onClose }: Props) {
  const [rejectionNote, setRejectionNote] = useState("");
  const { rejectProof, isRejecting } = useRejectPaymentProof(orderId);

  const handleReject = async () => {
    await rejectProof(rejectionNote);
    setRejectionNote("");
  };

  const isValidNote = rejectionNote.trim().length >= 10;
  const charCount = rejectionNote.length;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject payment proof?</AlertDialogTitle>
          <AlertDialogDescription>
            The customer will see your rejection reason and can resubmit a new
            proof.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="rejectionNote">
            Reason for rejection (shown to customer, minimum 10 characters)
          </Label>
          <Textarea
            id="rejectionNote"
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            placeholder="Explain why the proof is being rejected..."
            rows={4}
            disabled={isRejecting}
          />
          <p className="text-xs text-muted-foreground text-right">
            {charCount} characters{" "}
            {charCount < 10 && `(${10 - charCount} more required)`}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isRejecting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={!isValidNote || isRejecting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRejecting ? "Rejecting..." : "Reject Proof"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
