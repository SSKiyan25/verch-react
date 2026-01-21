"use client";

import { ProductWithDetails } from "@/lib/types/product";
import { ProductCard } from "./ProductCard";

interface ProductsGridProps {
  products: ProductWithDetails[];
}

export function ProductsGrid({ products }: ProductsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
