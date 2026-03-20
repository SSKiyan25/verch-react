import type { PublicProductVariationDetail } from "@/lib/supabase/queries/products";

export type StockLabel = {
  text: string;
  cls: string;
};

export function getStockLabel(v: PublicProductVariationDetail): StockLabel {
  if (!v.is_available)
    return { text: "Unavailable", cls: "text-muted-foreground" };
  if (v.available_quantity === 0) {
    if (v.pre_order_quantity > 0)
      return { text: "Pre-order", cls: "text-amber-600" };
    return { text: "Out of stock", cls: "text-destructive" };
  }
  if (v.available_quantity <= 10)
    return { text: `${v.available_quantity} left`, cls: "text-amber-600" };
  return { text: "In stock", cls: "text-emerald-600" };
}
