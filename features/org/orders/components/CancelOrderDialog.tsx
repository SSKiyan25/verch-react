"use client";

import { useState, startTransition } from "react";
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
import { useCancelOrder } from "@/features/org/orders/hooks/useCancelOrder";

type Props = {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Called immediately before the cancel request fires — use for optimistic UI updates. */
  onOptimisticCancel?: () => void;
};

export function CancelOrderDialog({
  orderId,
  isOpen,
  onClose,
  onOptimisticCancel,
}: Props) {
  const [cancelReason, setCancelReason] = useState("");
  const { execute, isPending } = useCancelOrder();

  const handleCancel = async () => {
    try {
      startTransition(() => {
        onOptimisticCancel?.();
      });
      await execute(orderId, cancelReason);
      setCancelReason("");
      onClose();
    } catch {
      // Error handled by hook toast; router.refresh() in hook reverts optimistic state
    }
  };

  const isValidReason = cancelReason.trim().length >= 10;
  const charCount = cancelReason.length;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The order will be marked as cancelled,
            and any reserved stock will be returned to available inventory.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancelReason">
            Reason for cancellation (minimum 10 characters)
          </Label>
          <Textarea
            id="cancelReason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Enter the reason for cancelling this order..."
            rows={4}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground text-right">
            {charCount} characters{" "}
            {charCount < 10 && `(${10 - charCount} more required)`}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isPending}>
            Back
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={!isValidReason || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Cancelling..." : "Cancel Order"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
