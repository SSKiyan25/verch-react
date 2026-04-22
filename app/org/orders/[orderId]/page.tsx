import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getCachedOrgOrderDetail } from "@/lib/data/org/orders";
import { OrgOrderDetailShell } from "@/features/org/orders/components/OrgOrderDetailShell";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrgOrderDetailPage({ params }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userRecord } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (
    !userRecord ||
    !userRecord.organization_id ||
    ![
      "organization_admin",
      "organization_manager",
      "organization_staff",
    ].includes(userRecord.role ?? "")
  ) {
    redirect("/login");
  }

  const { orderId } = await params;
  const order = await getCachedOrgOrderDetail(user.id, orderId);

  // console.log("Fetched order detail for orderId:", orderId, "Order:", order);
  // console.log("Order number:", order?.order_number);
  if (!order) notFound();

  return (
    <OrgOrderDetailShell
      order={order}
      userRole={userRecord.role}
      orgId={userRecord.organization_id}
    />
  );
}

export const metadata = { title: "Order Detail — Verch" };
