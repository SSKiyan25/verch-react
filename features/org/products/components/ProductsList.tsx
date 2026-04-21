"use client";

import { OrgProductListItem } from "@/lib/types/org-products";
import { ProductListItem } from "./ProductListItem";

interface ProductsListProps {
  products: OrgProductListItem[];
  orgId: string;
}

export function ProductsList({ products, orgId }: ProductsListProps) {
  return (
    <div className="space-y-4">
      {products.map((product) => (
        <ProductListItem key={product.id} product={product} orgId={orgId} />
      ))}
    </div>
  );
}
