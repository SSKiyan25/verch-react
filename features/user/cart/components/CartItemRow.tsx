"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2, Info } from "lucide-react";
import type { CartItem } from "@/lib/supabase/queries/user/cart";
import type { ProductActivePromotion } from "@/lib/types/public-promotions";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CartQuantityStepper } from "./CartQuantityStepper";
import { CartIssueWarning } from "./CartIssueWarning";
import { CartItemPrice } from "./CartItemPrice";
import { cn } from "@/lib/utils";

interface CartItemRowProps {
  item: CartItem;
  quantity: number;
  selected: boolean;
  onSelect: (itemId: string, checked: boolean) => void;
  onQuantityChange: (
    itemId: string,
    newQuantity: number,
    delta: number,
  ) => void;
  onRemove: (itemId: string, quantity: number) => void;
  promotion?: ProductActivePromotion | null;
}

export function CartItemRow({
  item,
  quantity,
  selected,
  onSelect,
  onQuantityChange,
  onRemove,
  promotion,
}: CartItemRowProps) {
  const [dismissedPriceChange, setDismissedPriceChange] = useState(false);

  const showPriceWarning = item.price_changed && !dismissedPriceChange;
  // console.log("Rendering CartItemRow", {
  //   item: {
  //     id: item.item_id,
  //     name: item.product_name,
  //     variation: item.variation_name,
  //     currentPrice: item.current_price,
  //     unitPriceSnapshot: item.unit_price_snapshot,
  //     itemUnavailable: item.is_unavailable,
  //     isPreOrder: item.is_pre_order,
  //     isOverStock: item.is_over_stock,
  //   },
  //   itemId: item.item_id,
  //   priceChanged: item.price_changed,
  //   dismissedPriceChange,
  //   showPriceWarning,
  // });
  return (
    <div
      className={cn(
        "space-y-2 rounded-md p-3 transition-all duration-200",
        item.is_unavailable && "opacity-60",
        item.is_pre_order && !item.is_unavailable && "bg-amber-50/40",
        !item.is_unavailable && "hover:bg-muted/50",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="pt-1">
          <Checkbox
            checked={selected}
            disabled={item.is_unavailable}
            onCheckedChange={(checked) =>
              onSelect(item.item_id, checked === true)
            }
            aria-label={`Select ${item.product_name}`}
          />
        </div>

        {/* Thumbnail */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
          {item.featured_photo_url ? (
            <Image
              src={item.featured_photo_url}
              alt={item.product_name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              N/A
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-sm font-medium leading-tight truncate">
            {item.product_name}
          </p>
          {item.variation_name && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 flex-wrap">
              <span className="truncate">{item.variation_name}</span>
              {item.is_pre_order && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200 shrink-0">
                  Pre-order
                </span>
              )}
            </p>
          )}
          <CartItemPrice
            currentPrice={item.current_price}
            quantity={quantity}
            priceChanged={item.price_changed}
            snapshotPrice={item.unit_price_snapshot}
            promotion={promotion}
            showSubtotal={false}
          />
        </div>

        {/* Stepper */}
        <CartQuantityStepper
          itemId={item.item_id}
          variationId={item.variation_id}
          currentQuantity={quantity}
          availableQuantity={item.available_quantity}
          isPreOrder={item.is_pre_order}
          isOverStock={item.is_over_stock}
          disabled={item.is_unavailable}
          onQuantityChange={onQuantityChange}
        />

        {/* Subtotal */}
        <div className="hidden sm:block w-20 text-right">
          <CartItemPrice
            currentPrice={item.current_price}
            quantity={quantity}
            promotion={promotion}
            showSubtotal={true}
          />
        </div>

        {/* Remove */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200 shrink-0 cursor-pointer"
          onClick={() => onRemove(item.item_id, quantity)}
          aria-label={`Remove ${item.product_name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Inline warnings */}
      {showPriceWarning && (
        <CartIssueWarning
          type="price_changed"
          message={`Price updated from ₱${item.unit_price_snapshot.toLocaleString("en-PH", { minimumFractionDigits: 2 })} to ₱${item.current_price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}. Please review before checkout.`}
          onDismiss={() => setDismissedPriceChange(true)}
        />
      )}
      {item.is_unavailable && (
        <CartIssueWarning
          type="unavailable"
          message="This item is no longer available."
        />
      )}
      {item.is_pre_order && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>
            Pre-order item placed. The organization will fulfill your order
            after approval.
          </span>
        </div>
      )}
      {item.is_over_stock && !item.is_unavailable && !item.is_pre_order && (
        <CartIssueWarning
          type="over_stock"
          message={`Only ${item.available_quantity} left in stock.`}
        />
      )}
    </div>
  );
}
