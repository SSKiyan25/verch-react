import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getPublicStoreById } from "@/lib/supabase/queries/stores";
import { getPublicProducts } from "@/lib/supabase/queries/products";
import {
  StoreHero,
  StoreProductsGrid,
  StoreProductsPagination,
} from "@/features/public/store";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

async function getCachedStore(orgId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("public-stores");

  return getPublicStoreById(orgId);
}

async function getCachedStoreProducts(orgId: string, page: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("public-products");

  return getPublicProducts({ orgId, page, pageSize: 20 });
}

export default async function StoreDetailPage({ params, searchParams }: Props) {
  const { id: org_id } = await params;
  const { page: pageParam } = await searchParams;
  const page = pageParam ? Number(pageParam) : 1;

  const [store, { products, totalCount, totalPages }] = await Promise.all([
    getCachedStore(org_id),
    getCachedStoreProducts(org_id, page),
  ]);

  if (!store) notFound();

  return (
    <main className="min-h-screen bg-background">
      <StoreHero store={store} />
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <StoreProductsGrid products={products} totalCount={totalCount} />
        <StoreProductsPagination
          page={page}
          totalPages={totalPages}
          orgId={org_id}
        />
      </section>
    </main>
  );
}
