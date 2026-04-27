"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  ArrowRight,
  PackageCheck,
  FileText,
  Ban,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateOrderStatus } from "@/features/org/orders/hooks/useUpdateOrderStatus";
import { useConfirmPayment } from "@/features/org/orders/hooks/useConfirmPayment";
import { useCompleteOrder } from "@/features/org/orders/hooks/useCompleteOrder";
import { CancelOrderDialog } from "@/features/org/orders/components/CancelOrderDialog";
import { RejectProofDialog } from "@/features/org/orders/components/RejectProofDialog";
import type { OrgOrderListItem } from "@/lib/supabase/queries/org-orders";
import {
  type OptimisticOrderPatch,
  getNextStatus,
  buildPaymentConfirmedPatch,
  buildProofRejectedPatch,
  buildOrderCancelledPatch,
  buildOrderCompletedPatch,
} from "@/features/org/orders/hooks/useOptimisticOrderStatus";

type Props = {
  order: OrgOrderListItem;
  userRole: string;
  addOptimistic: (patch: OptimisticOrderPatch) => void;
};

export function OrgOrderRowActions({ order, userRole, addOptimistic }: Props) {
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const { advanceStatus, nextStatusLabel, isUpdating } = useUpdateOrderStatus(
    order.id,
    order.status,
  );
  const { confirmPayment, isConfirming } = useConfirmPayment(order.id);
  const { completeOrder, isCompleting } = useCompleteOrder(order.id);

  const canManagePaymentAndCancellation = [
    "organization_admin",
    "organization_manager",
  ].includes(userRole);

  const showCancel =
    canManagePaymentAndCancellation &&
    ["pending", "confirmed"].includes(order.status);

  const showConfirmCash =
    canManagePaymentAndCancellation &&
    order.status === "pending" &&
    order.payment_method === "cash" &&
    order.payment_status === "pending";

  const showConfirmProof =
    canManagePaymentAndCancellation &&
    order.status === "pending" &&
    order.payment_status === "proof_submitted";

  const showRejectProof =
    canManagePaymentAndCancellation &&
    order.status === "pending" &&
    order.payment_status === "proof_submitted";

  const showAdvance =
    !["completed", "cancelled", "ready"].includes(order.status) &&
    order.payment_status === "confirmed";

  const showComplete =
    canManagePaymentAndCancellation &&
    order.status === "ready" &&
    order.payment_status === "confirmed";

  // If order is completed or cancelled, we don't need the three dots, but we still need the "View Details" button.
  // Actually, wait, the dropdown menu itself is the action. We can have "View Details" and "View Invoice".
  const hasQuickActions =
    showCancel ||
    showConfirmCash ||
    showConfirmProof ||
    showRejectProof ||
    showAdvance ||
    showComplete;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/org/orders/${order.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Link>
          </DropdownMenuItem>

          {hasQuickActions && <DropdownMenuSeparator />}

          {/* Payment Actions */}
          {showConfirmCash && (
            <DropdownMenuItem
              onClick={() => {
                addOptimistic(buildPaymentConfirmedPatch(order.id));
                confirmPayment();
              }}
              disabled={isConfirming}
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
              Confirm Cash Payment
            </DropdownMenuItem>
          )}

          {showConfirmProof && (
            <DropdownMenuItem
              onClick={() => {
                addOptimistic(buildPaymentConfirmedPatch(order.id));
                confirmPayment();
              }}
              disabled={isConfirming}
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
              Confirm Payment Proof
            </DropdownMenuItem>
          )}

          {showRejectProof && (
            <DropdownMenuItem
              onClick={() => setIsRejectOpen(true)}
              disabled={isConfirming}
            >
              <XCircle className="mr-2 h-4 w-4 text-red-600" />
              Reject Payment Proof
            </DropdownMenuItem>
          )}

          {/* Fulfillment Actions */}
          {showAdvance && (
            <DropdownMenuItem
              onClick={() => {
                const next = getNextStatus(order.status);
                if (next)
                  addOptimistic({ orderId: order.id, patch: { status: next } });
                advanceStatus();
              }}
              disabled={isUpdating}
            >
              <ArrowRight className="mr-2 h-4 w-4 text-blue-600" />
              {nextStatusLabel}
            </DropdownMenuItem>
          )}

          {showComplete && (
            <DropdownMenuItem
              onClick={() => {
                addOptimistic(buildOrderCompletedPatch(order.id));
                completeOrder();
              }}
              disabled={isCompleting}
            >
              <PackageCheck className="mr-2 h-4 w-4 text-teal-600" />
              Complete Order
            </DropdownMenuItem>
          )}

          {/* Invoices */}
          {order.status === "completed" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/org/orders/${order.id}`}>
                  <FileText className="mr-2 h-4 w-4 text-blue-600" />
                  View Invoice
                </Link>
              </DropdownMenuItem>
            </>
          )}

          {/* Cancellation */}
          {showCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsCancelOpen(true)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
              >
                <Ban className="mr-2 h-4 w-4" />
                Cancel Order
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelOrderDialog
        orderId={order.id}
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onOptimisticCancel={() =>
          addOptimistic(buildOrderCancelledPatch(order.id))
        }
      />

      <RejectProofDialog
        orderId={order.id}
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onOptimisticReject={() =>
          addOptimistic(buildProofRejectedPatch(order.id))
        }
      />
    </>
  );
}
