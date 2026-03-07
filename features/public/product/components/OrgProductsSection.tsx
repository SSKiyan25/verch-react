import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import type { PublicProductListItem } from "@/lib/supabase/queries/products";
import { ProductCard } from "@/features/public/products/components/ProductCard";

type Props = {
  organizationName: string;
  organizationId: string;
  products: PublicProductListItem[];
};

export function OrgProductsSection({
  organizationName,
  organizationId,
  products,
}: Props) {
  if (products.length === 0) return null;

  return (
    <section>
      {/* Heading row */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          More from <span className="text-primary">{organizationName}</span>
        </h2>
        <Button variant="ghost" size="sm" asChild className="shrink-0 gap-1">
          <Link href={`/store/${organizationId}`}>
            View Store
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Mobile: horizontal scroll — Desktop: 4-col grid */}
      <div className="flex gap-4 overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <div key={product.id} className="w-[200px] shrink-0 sm:w-auto">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
