"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ExternalLink, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfirmPayment } from "@/features/org/orders/hooks/useConfirmPayment";
import { useRejectPaymentProof } from "@/features/org/orders/hooks/useRejectPaymentProof";
import { RejectProofDialog } from "@/features/org/orders/components/RejectProofDialog";
import { getPaymentProofUrlAction } from "@/features/user/orders/actions/getPaymentProofUrlAction";
import type { OrgOrderDetail } from "@/lib/supabase/queries/org-orders";

type Props = {
  order: OrgOrderDetail;
  userRole: string;
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  gcash: "GCash",
  cash: "Cash on Pickup",
};

export function OrgPaymentReviewPanel({ order, userRole }: Props) {
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const { confirmPayment, isConfirming } = useConfirmPayment(order.id);
  const { isDialogOpen, setIsDialogOpen } = useRejectPaymentProof(order.id);

  const canManagePayment = [
    "organization_admin",
    "organization_manager",
  ].includes(userRole);

  // Fetch proof URL if available
  useEffect(() => {
    if (!order.proof_path) return;
    getPaymentProofUrlAction({ proofPath: order.proof_path })
      .then((result) => {
        if (result.success) setProofUrl(result.url);
      })
      .catch(console.error);
  }, [order.proof_path]);

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h3 className="font-semibold">Payment Review</h3>

      <div className="space-y-3 text-sm">
        {/* Payment method */}
        <div>
          <span className="text-muted-foreground">Method: </span>
          <span className="font-medium">
            {PAYMENT_METHOD_LABELS[order.payment_method]}
          </span>
        </div>

        {/* Payment status badge */}
        <div>
          {order.payment_status === "pending" && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              Awaiting Payment
            </Badge>
          )}
          {order.payment_status === "proof_submitted" && (
            <Badge
              variant="outline"
              className="gap-1 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
            >
              <Clock className="h-3 w-3" />
              Proof Submitted
            </Badge>
          )}
          {order.payment_status === "confirmed" && (
            <Badge
              variant="outline"
              className="gap-1 bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400"
            >
              <CheckCircle2 className="h-3 w-3" />
              Payment Confirmed
            </Badge>
          )}
          {order.payment_status === "rejected" && (
            <Badge
              variant="outline"
              className="gap-1 bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
            >
              <XCircle className="h-3 w-3" />
              Proof Rejected
            </Badge>
          )}
        </div>

        {/* Proof image (if submitted or confirmed) */}
        {proofUrl &&
          ["proof_submitted", "confirmed", "rejected"].includes(
            order.payment_status,
          ) && (
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">
                Payment Proof:
              </span>
              <a
                href={proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden border hover:opacity-90 transition-opacity">
                  <Image
                    src={proofUrl}
                    alt="Payment proof"
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1 group-hover:underline">
                  View full size
                  <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            </div>
          )}

        {/* Actions based on payment status */}
        {order.payment_status === "pending" && (
          <div className="space-y-2">
            {order.payment_method === "cash" ? (
              <p className="text-xs text-muted-foreground">
                Confirm payment once received in person at pickup.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Awaiting customer to upload payment proof.
              </p>
            )}
            {order.payment_method === "cash" && canManagePayment && (
              <Button
                onClick={confirmPayment}
                disabled={isConfirming}
                size="sm"
                className="w-full"
              >
                {isConfirming ? "Confirming..." : "Confirm Cash Payment"}
              </Button>
            )}
          </div>
        )}

        {order.payment_status === "proof_submitted" && canManagePayment && (
          <div className="space-y-2">
            <Button
              onClick={confirmPayment}
              disabled={isConfirming}
              size="sm"
              className="w-full"
              variant="default"
            >
              {isConfirming ? "Confirming..." : "Confirm Payment"}
            </Button>
            <Button
              onClick={() => setIsDialogOpen(true)}
              size="sm"
              variant="destructive"
              className="w-full"
            >
              Reject Proof
            </Button>
          </div>
        )}

        {order.payment_status === "confirmed" && (
          <p className="text-xs text-green-600 dark:text-green-400">
            ✓ Payment confirmed
          </p>
        )}

        {order.payment_status === "rejected" && (
          <p className="text-xs text-muted-foreground">
            Awaiting customer to resubmit proof.
          </p>
        )}
      </div>

      <RejectProofDialog
        orderId={order.id}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
}
