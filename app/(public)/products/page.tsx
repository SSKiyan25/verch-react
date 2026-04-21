import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { getPublicProducts } from "@/lib/supabase/queries/products";
import { getPublicCategories } from "@/lib/supabase/queries/categories";
import { getCachedProductsPromotions } from "@/lib/data/public/promotions";
import {
  ProductsGrid,
  ProductsFilter,
  ProductsPagination,
  ProductsHeader,
  ProductsSearchBar,
} from "@/features/public/products";

type SearchParams = {
  category?: string;
  min_price?: string;
  max_price?: string;
  page?: string;
  search?: string; // ← new
};

type Props = {
  searchParams: Promise<SearchParams>;
};

async function getCachedProducts(
  page: number,
  categoryId: string | undefined,
  minPrice: number | undefined,
  maxPrice: number | undefined,
  search: string | undefined,
) {
  "use cache";
  cacheLife("hours");
  cacheTag("public-products");

  return getPublicProducts({ page, categoryId, minPrice, maxPrice, search });
}

async function getCachedCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("public-categories");

  return getPublicCategories();
}

export default async function ProductsPage({ searchParams }: Props) {
  const {
    category,
    min_price,
    max_price,
    page: pageParam,
    search,
  } = await searchParams;

  const page = pageParam ? Number(pageParam) : 1;
  const categoryId = category;
  const minPrice = min_price ? Number(min_price) : undefined;
  const maxPrice = max_price ? Number(max_price) : undefined;

  const [{ products, totalCount, totalPages, pageSize }, categories] =
    await Promise.all([
      getCachedProducts(page, categoryId, minPrice, maxPrice, search),
      getCachedCategories(),
    ]);

  // Fetch promotions for all products on the current page (batch query)
  const productIds = products.map((p) => p.id);
  const promotionsMap =
    productIds.length > 0
      ? await getCachedProductsPromotions(productIds)
      : new Map();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Mobile layout: search bar full-width, then title + filter trigger */}
        <div className="mb-4 flex flex-col gap-3 lg:hidden">
          <div key={search ?? "no-search"}>
            <Suspense fallback={null}>
              <ProductsSearchBar />
            </Suspense>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <Suspense fallback={null}>
              <ProductsFilter categories={categories} />
            </Suspense>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar filter */}
          <div className="hidden lg:block">
            <Suspense fallback={null}>
              <ProductsFilter categories={categories} />
            </Suspense>
          </div>

          {/* Main content */}
          <div className="flex flex-1 flex-col gap-6 min-w-0">
            {/* Header + search bar row: hidden on mobile */}
            <div className="hidden lg:flex lg:items-start lg:gap-6">
              <div className="flex-1 min-w-0">
                <ProductsHeader
                  totalCount={totalCount}
                  page={page}
                  pageSize={pageSize}
                />
              </div>
              <div key={search ?? "no-search"} className="w-72 shrink-0">
                <Suspense fallback={null}>
                  <ProductsSearchBar />
                </Suspense>
              </div>
            </div>
            {/* Mobile count line */}
            <p className="text-sm text-muted-foreground lg:hidden">
              {totalCount} product{totalCount !== 1 ? "s" : ""}
            </p>

            <ProductsGrid products={products} promotionsMap={promotionsMap} />

            {/* Pagination — client component, needs Suspense */}
            <Suspense fallback={null}>
              <ProductsPagination totalPages={totalPages} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
