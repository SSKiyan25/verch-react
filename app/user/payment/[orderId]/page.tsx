import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetail } from "@/lib/supabase/queries/orders";
import { GCashPaymentShell } from "@/features/user/payment/components/GCashPaymentShell";

export default async function GCashPaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const order = await fetchOrderDetail(user.id, orderId);

  if (!order) {
    redirect("/user/orders");
  }

  // Verify this is a GCash order and payment is pending
  if (order.payment_method !== "gcash") {
    redirect(`/user/orders/${orderId}`);
  }

  // If proof already submitted or confirmed, go to order detail
  if (
    order.payment_status === "proof_submitted" ||
    order.payment_status === "confirmed"
  ) {
    redirect(`/user/orders/${orderId}`);
  }

  return <GCashPaymentShell order={order} />;
}
