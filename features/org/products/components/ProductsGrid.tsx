"use client";

import { ProductWithDetails } from "@/lib/types/product";
import { ProductCard } from "./ProductCard";

interface ProductsGridProps {
  products: ProductWithDetails[];
}

export function ProductsGrid({ products }: ProductsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
