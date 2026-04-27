"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Banknote,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { getOrgGCashSettingsAction } from "@/features/user/orders/actions/getOrgGCashSettingsAction";
import { createClient } from "@/lib/supabase/client";
import type { OrderDetail } from "@/lib/supabase/queries/orders";
import Image from "next/image";

interface OrderPaymentSectionProps {
  order: OrderDetail;
}

type GCashSettings = {
  number: string;
  accountName: string;
  qrImagePath: string | null;
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Awaiting Payment",
  proof_submitted: "Proof Submitted",
  confirmed: "Payment Confirmed",
  rejected: "Payment Rejected",
};

export function OrderPaymentSection({ order }: OrderPaymentSectionProps) {
  const router = useRouter();
  const {
    payment_method,
    payment_status,
    // proof_path,
    proof_amount,
    proof_reference_code,
    rejection_note,
  } = order;
  const [gcashSettings, setGcashSettings] = useState<GCashSettings | null>(
    null,
  );
  const supabase = createClient();

  useEffect(() => {
    if (payment_method !== "gcash") return;
    getOrgGCashSettingsAction(order.organization_id).then((result) => {
      if (result.success) setGcashSettings(result.gcash);
    });
  }, [order.organization_id, payment_method]);

  const needsPayment =
    payment_method === "gcash" &&
    (payment_status === "pending" || payment_status === "rejected");

  return (
    <div className="space-y-3">
      {/* Payment method + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {payment_method === "cash" ? (
            <Banknote className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="capitalize font-medium">
            {payment_method === "cash" ? "Cash on Pickup" : "GCash"}
          </span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {PAYMENT_STATUS_LABELS[payment_status]}
        </Badge>
      </div>

      {/* GCash payment details */}
      {payment_method === "gcash" && gcashSettings && needsPayment && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h4 className="font-medium text-sm">Send payment to:</h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Account Name</p>
                <p className="font-medium">{gcashSettings.accountName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">GCash Number</p>
                <p className="font-medium">{gcashSettings.number}</p>
              </div>
            </div>
            {gcashSettings.qrImagePath && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">QR Code</p>
                <Image
                  src={
                    supabase.storage
                      .from("org-gcash-qr")
                      .getPublicUrl(gcashSettings.qrImagePath).data.publicUrl
                  }
                  alt="GCash QR code"
                  width={200}
                  height={200}
                  className="rounded-lg border"
                />
              </div>
            )}
            <Button
              onClick={() => router.push(`/user/payment/${order.order_id}`)}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {payment_status === "rejected"
                ? "Re-submit Payment Proof"
                : "Submit Payment Proof"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rejection note */}
      {payment_status === "rejected" && rejection_note && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Payment rejected: </span>
            {rejection_note}
          </AlertDescription>
        </Alert>
      )}

      {/* Awaiting review */}
      {payment_status === "proof_submitted" && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="font-medium">Proof Submitted</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your payment proof has been submitted. Waiting for the store to
              review.
            </p>
            {(proof_amount != null || proof_reference_code) && (
              <div className="pt-2 space-y-2 border-t">
                {proof_amount != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Amount Paid</p>
                    <p className="font-medium tabular-nums">
                      ₱
                      {proof_amount.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}
                {proof_reference_code && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Reference Code
                    </p>
                    <p className="font-medium font-mono text-sm">
                      {proof_reference_code}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment confirmed */}
      {payment_status === "confirmed" && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="font-medium">Payment Confirmed</span>
            </div>
            {(proof_amount != null || proof_reference_code) && (
              <div className="pt-2 space-y-2 border-t">
                {proof_amount != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Amount Paid</p>
                    <p className="font-medium tabular-nums">
                      ₱
                      {proof_amount.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}
                {proof_reference_code && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Reference Code
                    </p>
                    <p className="font-medium font-mono text-sm">
                      {proof_reference_code}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
