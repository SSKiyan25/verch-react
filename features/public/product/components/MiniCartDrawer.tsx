"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { UpsertCartItemResult } from "@/lib/supabase/queries/user/cart";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export type MiniCartInfo = {
  productName: string;
  variationName: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
  upsertResult: UpsertCartItemResult;
};

type MiniCartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  info: MiniCartInfo | null;
};

export function MiniCartDrawer({
  open,
  onOpenChange,
  info,
}: MiniCartDrawerProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  const handleViewCart = () => {
    onOpenChange(false);
    router.refresh();
    router.push("/user/cart");
  };

  const handleContinueShopping = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col p-0",
          isMobile ? "h-auto rounded-t-2xl" : "w-[380px] sm:max-w-[380px]",
        )}
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            Added to Cart
          </SheetTitle>
        </SheetHeader>
        <Separator className="shrink-0" />

        {/* Body */}
        {info && (
          <div className="px-5 py-4 space-y-4">
            {/* Product summary row */}
            <div className="flex items-start gap-3">
              {/* Thumbnail */}
              <div className="shrink-0 h-16 w-16 rounded-md overflow-hidden border bg-muted">
                {info.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={info.imageUrl}
                    alt={info.productName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-semibold leading-tight line-clamp-2">
                  {info.productName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {info.variationName}
                </p>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-sm font-bold text-primary tabular-nums">
                    {formatPrice(info.unitPrice * info.quantity)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {info.quantity} × {formatPrice(info.unitPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Over-stock warning */}
            {info.upsertResult.is_over_stock && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-xs leading-snug">
                  <span className="font-semibold">Heads up:</span> Your cart has{" "}
                  {info.upsertResult.quantity} of this item, but only{" "}
                  {info.upsertResult.available_quantity} are currently in stock.
                  You can still place the order — we&rsquo;ll confirm
                  availability at checkout.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sticky footer */}
        <Separator className="shrink-0" />
        <div className="shrink-0 px-5 py-4 flex flex-col gap-2">
          <Button className="w-full" onClick={handleViewCart}>
            View Cart
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleContinueShopping}
          >
            Continue Shopping
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
