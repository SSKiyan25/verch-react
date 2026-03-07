"use client";

import { ProductWithDetails } from "@/lib/types/product";
import { ProductCard } from "./ProductCard";

interface ProductsGridProps {
  products: ProductWithDetails[];
  onProductUpdate: (product: ProductWithDetails) => void;
}

export function ProductsGrid({ products, onProductUpdate }: ProductsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-stretch">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onProductUpdate={onProductUpdate}
        />
      ))}
    </div>
  );
}
