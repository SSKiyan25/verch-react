import { unstable_cache } from "next/cache";
import {
  getPublicProductById,
  getPublicProducts,
} from "@/lib/supabase/queries/products";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductDetail } from "@/features/public/product";
import { OrgProductsSection } from "@/features/public/product/components/OrgProductsSection";
import { ProductReviews } from "@/features/public/product/components/ProductReviews";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  // Check auth state (public page — no redirect, just pass boolean down)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  const getCachedProduct = unstable_cache(
    () => getPublicProductById(id),
    ["public-product-detail", id],
    { revalidate: 60, tags: ["public-products", "public-product-detail"] },
  );

  const product = await getCachedProduct();
  if (!product) notFound();
  // console.log("Fetched product detail:", { id, product });
  const getCachedOrgProducts = unstable_cache(
    () => getPublicProducts({ orgId: product.organization_id, pageSize: 8 }),
    ["org-products", product.organization_id],
    { revalidate: 60, tags: ["public-products"] },
  );

  const { products: orgProducts } = await getCachedOrgProducts();
  const otherOrgProducts = orgProducts.filter((p) => p.id !== product.id);

  return (
    <>
      <ProductDetail product={product} isAuthenticated={isAuthenticated} />
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
