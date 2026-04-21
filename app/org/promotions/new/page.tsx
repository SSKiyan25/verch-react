import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PromotionForm } from "@/features/org/promotions/components/PromotionForm";

export default async function NewPromotionPage() {
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

  return (
    <div className="container max-w-4xl py-6 md:py-10">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Create New Promotion
        </h1>
        <p className="text-muted-foreground">
          Set up a new discount or special offer for your customers.
        </p>
      </div>

      <PromotionForm orgId={userRecord.organization_id} mode="create" />
    </div>
  );
}

export const metadata = {
  title: "Create Promotion — Verch",
  description: "Create a new promotion for your organization",
};
