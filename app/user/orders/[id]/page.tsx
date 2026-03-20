import { notFound, redirect } from "next/navigation";
import { getCachedOrderDetail } from "@/lib/data/user/orders";
import { createClient } from "@/lib/supabase/server";
import { OrderDetailShell } from "@/features/user/orders/components/OrderDetailShell";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id: orderId } = await params;

  const order = await getCachedOrderDetail(user.id, orderId);

  if (!order) {
    notFound();
  }

  return <OrderDetailShell order={order} />;
}
