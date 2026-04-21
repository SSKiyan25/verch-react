import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCachedOrgProducts } from "@/lib/data/org/products";
import { getPublicCategories } from "@/lib/supabase/queries/categories";
import { ProductsShell } from "@/features/org/products/components/ProductsShell";
import type {
  OrgProductFilters,
  ProductStatus,
} from "@/lib/types/org-products";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    category?: string;
    search?: string;
    archived?: string;
    page?: string;
    limit?: string;
  }>;
};

export default async function OrgProductsPage({ searchParams }: PageProps) {
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

  const filters: OrgProductFilters = {
    status: params.status as ProductStatus | undefined,
    categoryId: params.category,
    search: params.search,
    isArchived: params.archived === "true",
  };

  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Number(params.limit ?? 12);

  const [productsResult, categories] = await Promise.all([
    getCachedOrgProducts(userRecord.organization_id, filters, page, limit),
    getPublicCategories(userRecord.organization_id),
  ]);

  // console.log("Products result:", productsResult);
  // console.log("Categories:", categories);

  return (
    <ProductsShell
      products={productsResult.items}
      totalCount={productsResult.totalCount}
      categories={categories}
      orgId={userRecord.organization_id}
      filters={filters}
      page={page}
      limit={limit}
    />
  );
}

export const metadata = { title: "Products — Verch" };
