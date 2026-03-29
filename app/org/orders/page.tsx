import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCachedOrgOrders } from "@/lib/data/org/orders";
import { OrgOrdersShell } from "@/features/org/orders/components/OrgOrdersShell";
import type { OrgOrderFilters } from "@/lib/supabase/queries/org-orders";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    payment?: string;
    q?: string;
    page?: string;
  }>;
};

export default async function OrgOrdersPage({ searchParams }: PageProps) {
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

  const params = await searchParams;

  const filters: OrgOrderFilters = {
    status: params.status as OrgOrderFilters["status"],
    paymentStatus: params.payment as OrgOrderFilters["paymentStatus"],
    search: params.q,
    page: params.page ? parseInt(params.page, 10) : 1,
    pageSize: 10,
  };

  const result = await getCachedOrgOrders(
    user.id,
    userRecord.organization_id,
    filters,
  );

  // Guard: if first order has no id, treat as empty result (stale cache)
  const safeResult =
    result.orders.length > 0 && !result.orders[0].id
      ? { orders: [], total_count: 0 }
      : result;

  return (
    <OrgOrdersShell
      orgId={userRecord.organization_id}
      userRole={userRecord.role}
      initialOrders={safeResult.orders}
      totalCount={safeResult.total_count}
      currentFilters={filters}
    />
  );
}

export const metadata = { title: "Orders — Verch" };
