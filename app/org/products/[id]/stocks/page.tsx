import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCachedOrgProductDetail,
  getCachedStockLogs,
} from "@/lib/data/org/products";
import { StockManagementShell } from "@/features/org/stocks/components/StockManagementShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import React from "react"; // Added to use React.ComponentProps

interface StockPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ r?: string; tab?: string }>;
}

export default async function StockManagementPage(props: StockPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const productId = params.id;
  // Use refresh param as key to force remount with fresh data
  const refreshKey = searchParams.r || "initial";
  const defaultTab = searchParams.tab || "manage";

  // 1. Auth Check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Role Gate - fetch from database
  const { data: userData } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const orgId = userData?.organization_id;
  const userRole = userData?.role;

  if (
    !orgId ||
    ![
      "organization_admin",
      "organization_manager",
      "organization_staff",
    ].includes(userRole ?? "")
  ) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don&apos;t have permission to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // 3. Parallel Data Fetching
  // FIX: Flipped productId and orgId to match signature, and added null, 1, 10
  const [product] = await Promise.all([
    getCachedOrgProductDetail(productId, orgId),
    getCachedStockLogs(productId, orgId, null, 1, 10),
  ]);

  if (!product) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Product not found. Please try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // 4. Render Shell Component
  // FIX: Replaced 'any' with a dynamic inferrence of the shell's expected prop type
  // Key prop forces remount when data changes
  return (
    <StockManagementShell
      key={refreshKey}
      product={
        product as unknown as React.ComponentProps<
          typeof StockManagementShell
        >["product"]
      }
      orgId={orgId}
      productId={productId}
      defaultTab={defaultTab as "manage" | "history"}
    />
  );
}
