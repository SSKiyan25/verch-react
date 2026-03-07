import type { PublicProductListItem } from "@/lib/supabase/queries/products";
import { StoreProductCard } from "./StoreProductCard";
import { StoreEmptyProducts } from "./StoreEmptyProducts";

type StoreProductsGridProps = {
  products: PublicProductListItem[];
  totalCount: number;
};

export function StoreProductsGrid({
  products,
  totalCount,
}: StoreProductsGridProps) {
  if (totalCount === 0) {
    return <StoreEmptyProducts />;
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Products</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalCount}</span>{" "}
          available
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
        {products.map((product) => (
          <StoreProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
