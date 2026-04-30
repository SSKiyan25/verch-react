import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductsGrid } from "@/features/public/products";
import type { PublicProductListItem } from "@/lib/supabase/queries/products";
import type { ProductPromotionsMap } from "@/lib/types/public-promotions";

type Props = {
  products: PublicProductListItem[];
  promotionsMap: ProductPromotionsMap;
};

export function HomepageFeaturedProducts({ products, promotionsMap }: Props) {
  // Show first 8 products
  const displayProducts = products.slice(0, 8);

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            New Arrivals
          </h2>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            See all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Products Grid */}
        <ProductsGrid
          products={displayProducts}
          promotionsMap={promotionsMap}
        />
      </div>
    </section>
  );
}
