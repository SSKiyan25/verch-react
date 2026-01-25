"use client";

import { ProductWithDetails } from "@/lib/types/product";
import { ProductCard } from "./ProductCard";

interface ProductsGridProps {
  products: ProductWithDetails[];
  onProductUpdate: (product: ProductWithDetails) => void;
}

export function ProductsGrid({ products, onProductUpdate }: ProductsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
