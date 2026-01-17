import { Suspense } from "react";
import { ProductsHeader } from "@/features/org/products/components/ProductsHeader";
import { ProductsContent } from "@/features/org/products/components/ProductsContent";
import { ProductsLoading } from "@/features/org/products/components/ProductsLoading";

export default function OrganizationProducts() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <ProductsHeader />
      <Suspense fallback={<ProductsLoading />}>
        <ProductsContent />
      </Suspense>
    </div>
  );
}
