import { ShoppingBag } from "lucide-react";

export function StoreEmptyProducts() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">No products yet</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        This store hasn&apos;t listed any products. Check back soon.
      </p>
    </div>
  );
}
