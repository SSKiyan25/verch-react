"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGCashSettings } from "@/features/user/payment/hooks/useGCashSettings";
import { GCashDetailsCard } from "./GCashDetailsCard";
import { PaymentVerificationFlow } from "@/features/payments/ocr";
import type { OrderDetail } from "@/lib/supabase/queries/orders";

export function GCashPaymentShell({
  order,
  justPlaced,
}: {
  order: OrderDetail;
  justPlaced?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (justPlaced) {
      toast.success("Order placed!", {
        description:
          "Upload your GCash payment proof below for automatic verification.",
        duration: 6000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { gcashSettings, isLoading: isLoadingSettings } = useGCashSettings(
    order.organization_id,
  );

  const handlePaymentConfirmed = (refNo: string) => {
    toast.success("Payment verified!", {
      description: `Reference Number: ${refNo}`,
      duration: 5000,
    });
    router.push(`/user/orders/${order.order_id}`);
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-8 py-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Complete Your Payment
        </h1>
        <p className="text-sm text-gray-600">
          Order #{order.order_number} • {order.org_name}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: GCash Details */}
        <div>
          <GCashDetailsCard
            settings={gcashSettings}
            isLoading={isLoadingSettings}
          />
        </div>

        {/* Right: Automatic Payment Verification */}
        <div>
          {!isLoadingSettings && !gcashSettings ? (
            <Alert className="border-orange-200 bg-orange-50 text-orange-800">
              <AlertDescription>
                This organization hasn&apos;t configured GCash yet. Payment
                submission is unavailable.
              </AlertDescription>
            </Alert>
          ) : (
            <Card className="border-2 border-emerald-200 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-900">
                  <Upload className="h-5 w-5" />
                  Automatic Payment Verification
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Upload your GCash receipt — we&apos;ll automatically extract
                  and verify your Reference Number
                </p>
              </CardHeader>
              <CardContent>
                <PaymentVerificationFlow
                  orderId={order.order_id}
                  onPaymentConfirmed={handlePaymentConfirmed}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
