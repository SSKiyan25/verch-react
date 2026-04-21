import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import {
  getPublicProductById,
  getPublicProducts,
} from "@/lib/supabase/queries/products";
import { getCachedProductPromotions } from "@/lib/data/public/promotions";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductDetail } from "@/features/public/product";
import { OrgProductsSection } from "@/features/public/product/components/OrgProductsSection";
import { ProductReviews } from "@/features/public/product/components/ProductReviews";

type Props = {
  params: Promise<{ id: string }>;
};

async function getCachedProduct(productId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("public-products");
  cacheTag("public-product-detail");

  return getPublicProductById(productId);
}

async function getCachedOrgProducts(orgId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("public-products");

  return getPublicProducts({ orgId, pageSize: 8 });
}

async function getAuthState() {
  // Separate async component for uncached auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

async function ProductDetailContent({ productId }: { productId: string }) {
  const isAuthenticated = await getAuthState();
  const product = await getCachedProduct(productId);

  if (!product) notFound();

  // Fetch user ID for eligibility checks (if authenticated)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // Fetch promotions for this product
  const promotions = await getCachedProductPromotions(productId, userId);

  const { products: orgProducts } = await getCachedOrgProducts(
    product.organization_id,
  );
  const otherOrgProducts = orgProducts.filter((p) => p.id !== product.id);

  return (
    <>
      <ProductDetail
        product={product}
        isAuthenticated={isAuthenticated}
        promotions={promotions}
      />
      <hr className="my-8 max-w-6xl mx-auto border-gray-300" />
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-12 sm:px-6 lg:px-8">
        <OrgProductsSection
          organizationName={product.organization_name}
          organizationId={product.organization_id}
          products={otherOrgProducts}
        />
        <hr className="my-8 max-w-6xl mx-auto border-gray-300" />
        <ProductReviews productId={product.id} />
      </div>
    </>
  );
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <ProductDetailContent productId={id} />
    </Suspense>
  );
}
