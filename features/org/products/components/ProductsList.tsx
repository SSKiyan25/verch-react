"use client";

import { ProductWithDetails } from "@/lib/types/product";
import { ProductListItem } from "./ProductListItem";

interface ProductsListProps {
  products: ProductWithDetails[];
}

export function ProductsList({ products }: ProductsListProps) {
  return (
    <div className="space-y-4">
      {products.map((product) => (
        <ProductListItem key={product.id} product={product} />
      ))}
    </div>
  );
}
