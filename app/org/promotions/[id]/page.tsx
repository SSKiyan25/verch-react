import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getCachedOrgPromotionDetail } from "@/lib/data/org/promotions";
import { PromotionDetail } from "@/features/org/promotions/components/PromotionDetail";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PromotionDetailPage({ params }: PageProps) {
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

  const { id } = await params;

  const promotion = await getCachedOrgPromotionDetail(
    id,
    userRecord.organization_id,
  );

  if (!promotion) {
    notFound();
  }

  return (
    <div className="container max-w-6xl py-6 md:py-10">
      <PromotionDetail
        promotion={promotion}
        orgId={userRecord.organization_id}
      />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      title: "Promotion Detail — Verch",
    };
  }

  const { data: userRecord } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userRecord?.organization_id) {
    return {
      title: "Promotion Detail — Verch",
    };
  }

  const { id } = await params;
  const promotion = await getCachedOrgPromotionDetail(
    id,
    userRecord.organization_id,
  );

  return {
    title: promotion ? `${promotion.name} — Verch` : "Promotion Detail — Verch",
    description: promotion?.description ?? "View promotion details",
  };
}
