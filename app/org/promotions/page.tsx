import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCachedOrgPromotions } from "@/lib/data/org/promotions";
import { PromotionsShell } from "@/features/org/promotions/components/PromotionsShell";
import type { OrgPromotionFilters } from "@/lib/types/org-promotions";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    triggerType?: string;
    search?: string;
    page?: string;
  }>;
};

export default async function OrgPromotionsPage({ searchParams }: PageProps) {
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

  const filters: OrgPromotionFilters = {
    status: params.status as OrgPromotionFilters["status"],
    triggerType: params.triggerType as OrgPromotionFilters["triggerType"],
    search: params.search ?? null,
  };

  const page = Math.max(1, Number(params.page ?? 1));
  const limit = 20;

  const result = await getCachedOrgPromotions(
    userRecord.organization_id,
    filters,
    page,
    limit,
  );

  return (
    <PromotionsShell
      promotions={result.items}
      totalCount={result.totalCount}
      orgId={userRecord.organization_id}
    />
  );
}

export const metadata = {
  title: "Promotions — Verch",
  description: "Manage your organization's promotions and discounts",
};
