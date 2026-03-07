import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
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

export default async function StoreDetailPage({ params, searchParams }: Props) {
  const { id: org_id } = await params;
  const { page: pageParam } = await searchParams;
  const page = pageParam ? Number(pageParam) : 1;

  const getCachedStore = unstable_cache(
    () => getPublicStoreById(org_id),
    ["public-store", org_id],
    { revalidate: 60, tags: ["public-stores"] },
  );

  const getCachedProducts = unstable_cache(
    () => getPublicProducts({ orgId: org_id, page, pageSize: 20 }),
    ["public-store-products", org_id, String(page)],
    { revalidate: 60, tags: ["public-products"] },
  );

  const [store, { products, totalCount, totalPages }] = await Promise.all([
    getCachedStore(),
    getCachedProducts(),
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
