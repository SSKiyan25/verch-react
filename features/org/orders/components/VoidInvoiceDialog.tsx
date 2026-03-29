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
import { useVoidInvoice } from "@/features/org/orders/hooks/useVoidInvoice";

type Props = {
  invoiceId: string;
  isOpen: boolean;
  onClose: () => void;
};

export function VoidInvoiceDialog({ invoiceId, isOpen, onClose }: Props) {
  const [voidReason, setVoidReason] = useState("");
  const { voidInvoice, isVoiding } = useVoidInvoice(invoiceId);

  const handleVoid = async () => {
    await voidInvoice(voidReason);
    setVoidReason("");
  };

  const isValidReason = voidReason.trim().length >= 10;
  const charCount = voidReason.length;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The invoice will be marked as void and
            a new invoice can be reissued if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="voidReason">
            Reason for voiding (minimum 10 characters)
          </Label>
          <Textarea
            id="voidReason"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Enter the reason for voiding this invoice..."
            rows={4}
            disabled={isVoiding}
          />
          <p className="text-xs text-muted-foreground text-right">
            {charCount} characters{" "}
            {charCount < 10 && `(${10 - charCount} more required)`}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isVoiding}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleVoid}
            disabled={!isValidReason || isVoiding}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isVoiding ? "Voiding..." : "Void Invoice"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
