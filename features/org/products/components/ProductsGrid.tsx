"use client";

import { OrgProductListItem } from "@/lib/types/org-products";
import { ProductCard } from "./ProductCard";

interface ProductsGridProps {
  products: OrgProductListItem[];
  orgId: string;
}

export function ProductsGrid({ products, orgId }: ProductsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 items-stretch">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} orgId={orgId} />
      ))}
    </div>
  );
}
