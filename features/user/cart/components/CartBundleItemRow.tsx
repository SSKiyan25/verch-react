"use client";

import Image from "next/image";
import type { CartItem } from "@/lib/supabase/queries/user/cart";
import { cn } from "@/lib/utils";

interface CartBundleItemRowProps {
  item: CartItem;
}

/** Display-only row for a bundle component item. No checkbox, stepper, or remove. */
export function CartBundleItemRow({ item }: CartBundleItemRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2",
        item.is_unavailable && "opacity-50",
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
        {item.featured_photo_url ? (
          <Image
            src={item.featured_photo_url}
            alt={item.product_name}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            N/A
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.product_name}</p>
        {item.variation_name && (
          <p className="text-xs text-muted-foreground truncate">
            {item.variation_name}
          </p>
        )}
      </div>

      {/* Quantity (display only) */}
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        ×{item.quantity}
      </span>
    </div>
  );
}
