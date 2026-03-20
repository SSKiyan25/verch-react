"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useCancelOrder } from "@/features/user/orders/hooks/useCancelOrder";
import type { OrderStatus } from "@/lib/supabase/queries/orders";

interface CancelOrderDialogProps {
  orderId: string;
  orderStatus: OrderStatus;
}

export function CancelOrderDialog({
  orderId,
  orderStatus,
}: CancelOrderDialogProps) {
  const { reason, setReason, isCancelling, error, cancel } = useCancelOrder({
    orderId,
  });

  // Only render for pending orders
  if (orderStatus !== "pending") return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Cancel Order
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Your cart items will not be restored.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Optional cancellation reason */}
        <div className="py-2">
          <Textarea
            placeholder="Reason for cancellation (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="resize-none text-sm"
            disabled={isCancelling}
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {reason.length}/500
          </p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>
            Keep Order
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void cancel();
            }}
            disabled={isCancelling}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isCancelling ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Yes, cancel order"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
