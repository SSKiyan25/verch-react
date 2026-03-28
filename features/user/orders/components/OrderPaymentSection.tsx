"use client";

import { useEffect, useState } from "react";
import { Banknote, Smartphone, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { GCashProofUploader } from "@/features/user/orders/components/GCashProofUploader";
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
  const { payment_method, payment_status, proof_path, rejection_note } = order;
  const [gcashSettings, setGcashSettings] = useState<GCashSettings | null>(
    null,
  );
  const supabase = createClient();

  useEffect(() => {
    if (payment_method !== "gcash") return;
    getOrgGCashSettingsAction(order.org_id).then((result) => {
      if (result.success) setGcashSettings(result.gcash);
    });
  }, [order.org_id, payment_method]);

  const showUploader =
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
      {payment_method === "gcash" &&
        gcashSettings &&
        (payment_status === "pending" || payment_status === "rejected") && (
          <Card>
            <CardContent className="pt-6 space-y-3">
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
              <Alert>
                <AlertDescription className="text-xs">
                  After sending payment, upload your GCash screenshot below.
                </AlertDescription>
              </Alert>
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

      {/* GCash uploader */}
      {showUploader && (
        <GCashProofUploader
          orderId={order.order_id}
          currentProofPath={proof_path}
        />
      )}

      {/* Awaiting review */}
      {payment_status === "proof_submitted" && (
        <p className="text-sm text-muted-foreground">
          Your proof has been submitted. Waiting for the store to review.
        </p>
      )}

      {/* Payment confirmed */}
      {payment_status === "confirmed" && (
        <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Payment confirmed</span>
        </div>
      )}
    </div>
  );
}
