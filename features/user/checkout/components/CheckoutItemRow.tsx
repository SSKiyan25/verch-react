"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CheckoutCartItem } from "@/features/user/checkout/types/checkoutTypes";

interface CheckoutItemRowProps {
  item: CheckoutCartItem;
  isComponent?: boolean;
}

function AttributeChips({
  attributes,
}: {
  attributes: Record<string, string>;
}) {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("PHP", "₱");

export function CheckoutItemRow({
  item,
  isComponent = false,
}: CheckoutItemRowProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 py-2",
        isComponent && "pl-8 opacity-80",
      )}
    >
      {/* Thumbnail — only for standalone (not components) */}
      {!isComponent && (
        <div className="shrink-0 w-10 h-10 rounded overflow-hidden bg-muted border">
          {item.productFeaturedPhotoUrl ? (
            <Image
              src={item.productFeaturedPhotoUrl}
              alt={item.productName}
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
        </div>
      )}

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">
          {isComponent
            ? (item.variationName ?? item.productName)
            : item.productName}
        </p>
        {!isComponent && item.variationName && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.variationName}
          </p>
        )}
        <AttributeChips attributes={item.attributes} />
        {item.isPreOrder && (
          <Badge
            variant="secondary"
            className="text-xs mt-0.5 bg-blue-50 text-blue-700 border-blue-200"
          >
            Pre-order
          </Badge>
        )}
      </div>

      {/* Qty + price */}
      <div className="text-right text-sm shrink-0">
        {isComponent ? (
          <span className="text-xs text-muted-foreground">Included</span>
        ) : (
          <>
            <p className="text-muted-foreground">× {item.quantity}</p>
            <p className="font-medium">
              {formatCurrency(item.unitPriceSnapshot)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
