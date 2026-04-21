import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getCachedOrgPromotionDetail } from "@/lib/data/org/promotions";
import { PromotionForm } from "@/features/org/promotions/components/PromotionForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPromotionPage({ params }: PageProps) {
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

  // Prevent editing expired or exhausted promotions
  if (promotion.status === "expired" || promotion.status === "exhausted") {
    redirect(`/org/promotions/${id}`);
  }

  return (
    <div className="container max-w-4xl py-6 md:py-10">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Edit Promotion</h1>
        <p className="text-muted-foreground">
          Update the details of &ldquo;{promotion.name}&rdquo;.
        </p>
      </div>

      <PromotionForm
        orgId={userRecord.organization_id}
        mode="edit"
        initialData={promotion}
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
      title: "Edit Promotion — Verch",
    };
  }

  const { data: userRecord } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userRecord?.organization_id) {
    return {
      title: "Edit Promotion — Verch",
    };
  }

  const { id } = await params;
  const promotion = await getCachedOrgPromotionDetail(
    id,
    userRecord.organization_id,
  );

  return {
    title: promotion
      ? `Edit ${promotion.name} — Verch`
      : "Edit Promotion — Verch",
    description: promotion
      ? `Edit ${promotion.name}`
      : "Edit promotion details",
  };
}
