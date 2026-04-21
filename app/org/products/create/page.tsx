import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/features/org/product/components/ProductForm";
import { redirect } from "next/navigation";
import type { PublicCategory } from "@/lib/supabase/queries/categories";

export default async function NewProductPage() {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 2. Role gate — fetch from DB
  const { data: userRecord } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (
    !userRecord ||
    !userRecord.organization_id ||
    !["organization_admin", "organization_manager"].includes(
      userRecord.role ?? "",
    )
  ) {
    // organization_staff cannot create products — redirect to list
    redirect("/org/products");
  }

  // 3. Fetch categories for the creation form
  const { data: categoriesData, error: categoriesError } = await supabase.rpc(
    "get_public_categories",
    {
      p_org_id: userRecord.organization_id,
    },
  );

  if (categoriesError) {
    console.error("Failed to fetch categories:", categoriesError);
  }

  const categories: PublicCategory[] = (categoriesData ?? []).map(
    (row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: (row.description as string | null) ?? null,
      icon: (row.icon as string | null) ?? null,
      parent_id: (row.parent_id as string | null) ?? null,
      sort_order: Number(row.sort_order ?? 0),
    }),
  );

  // 4. Fetch organization settings to get commission rate
  const { data: orgSettingsData, error: orgSettingsError } = await supabase.rpc(
    "get_org_settings",
    {
      p_user_id: user.id,
      p_org_id: userRecord.organization_id,
    },
  );

  if (orgSettingsError) {
    console.error("Failed to fetch org settings:", orgSettingsError);
  }

  // Extract commission rate from settings (expecting whole number like 5 for 5%)
  let commissionRate = 0;
  if (
    orgSettingsData &&
    Array.isArray(orgSettingsData) &&
    orgSettingsData.length > 0
  ) {
    const settings = orgSettingsData[0];
    const outSettings = settings.out_settings as Record<string, unknown> | null;
    commissionRate = (outSettings?.commissionRate as number) ?? 0;
  }

  // 5. Render Client Component with pre-loaded data
  return (
    <ProductForm
      orgId={userRecord.organization_id}
      userId={user.id}
      categories={categories}
      commissionRate={commissionRate}
    />
  );
}
