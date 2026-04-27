import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCachedOrgProductOrderSummary } from "@/lib/data/org/product-orders";
import { OrgProductOrdersShell } from "@/features/org/orders/components/OrgProductOrdersShell";
import type { OrgProductSummaryFilters } from "@/lib/supabase/queries/org-product-orders";

type PageProps = {
  searchParams: Promise<{
    date_from?: string;
    date_to?: string;
    search?: string;
    status?: string;
  }>;
};

export default async function OrgProductOrdersPage({
  searchParams,
}: PageProps) {
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

  const filters: OrgProductSummaryFilters = {
    date_from: params.date_from,
    date_to: params.date_to,
    search: params.search,
    status: params.status,
  };

  const summary = await getCachedOrgProductOrderSummary(
    user.id,
    userRecord.organization_id,
    filters,
  );

  return (
    <OrgProductOrdersShell
      summary={summary}
      orgId={userRecord.organization_id}
      userRole={userRecord.role}
      currentFilters={filters}
    />
  );
}

export const metadata = { title: "Product Orders — Verch" };
