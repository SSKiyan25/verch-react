import { getUserSecurityStatus } from "@/app/actions/user-settings";
import { getCachedOrganization } from "@/lib/data/organization";
import { ProductForm } from "@/features/org/product/components/ProductForm";
import { redirect } from "next/navigation";

export default async function NewProductPage() {
  // 1. Fetch User & Organization ID (Server Side - Fast)
  const securityStatus = await getUserSecurityStatus();

  // Guard: If no organization is linked, redirect to setup
  if (!securityStatus?.organizationId) {
    redirect("/org/products");
  }

  // 2. Fetch Organization Data (Server Side - Hits Redis/Tag Cache)
  const organization = await getCachedOrganization(
    securityStatus.organizationId
  );

  // Guard: If organization data is missing despite having an ID
  if (!organization) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h3 className="text-lg font-semibold">Organization not found</h3>
        <p className="text-muted-foreground">
          Unable to load organization details.
        </p>
      </div>
    );
  }

  // 3. Render Client Component with PRE-LOADED Data
  // The Client Component (ProductForm) no longer needs to fetch anything.
  return <ProductForm organization={organization} />;
}
