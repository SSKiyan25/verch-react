import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCachedOrgOrdersByProduct } from "@/lib/data/org/product-orders";
import { OrgProductOrderDetailShell } from "@/features/org/orders/components/OrgProductOrderDetailShell";
import type { OrgProductOrderFilters } from "@/lib/supabase/queries/org-product-orders";

type PageProps = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{
    status?: string;
    date_from?: string;
    date_to?: string;
    variation_id?: string;
    page?: string;
  }>;
};

export default async function OrgProductOrderDetailPage({
  params,
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

  const { productId } = await params;
  const sp = await searchParams;

  const filters: OrgProductOrderFilters = {
    product_id: productId,
    status: (sp.status as OrgProductOrderFilters["status"]) ?? undefined,
    variation_id: sp.variation_id ?? undefined,
    date_from: sp.date_from ?? undefined,
    date_to: sp.date_to ?? undefined,
    page: sp.page ? parseInt(sp.page, 10) : 1,
    page_size: 20,
  };

  const result = await getCachedOrgOrdersByProduct(
    user.id,
    userRecord.organization_id,
    filters,
  );

  return (
    <OrgProductOrderDetailShell
      items={result.items}
      totalCount={result.total_count}
      productId={productId}
      orgId={userRecord.organization_id}
      userRole={userRecord.role}
      currentFilters={filters}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { productId } = await params;
  return { title: `Product Orders — ${productId.slice(0, 8)} — Verch` };
}
