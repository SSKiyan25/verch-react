"use client";

import { Package, Trash2 } from "lucide-react";
import type { CartBundleGroup as CartBundleGroupType } from "@/lib/supabase/queries/user/cart";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CartBundleItemRow } from "./CartBundleItemRow";
import { CartIssueWarning } from "./CartIssueWarning";
import { cn } from "@/lib/utils";

interface CartBundleGroupProps {
  group: CartBundleGroupType;
  selected: boolean;
  onSelect: (bundleInstanceId: string, checked: boolean) => void;
  onRemove: (bundleInstanceId: string, totalQuantity: number) => void;
}

export function CartBundleGroup({
  group,
  selected,
  onSelect,
  onRemove,
}: CartBundleGroupProps) {
  const hasUnavailable = group.items.some((i) => i.is_unavailable);
  const totalComponentQty = group.items.reduce((s, i) => s + i.quantity, 0);
  const totalBundleQuantity = totalComponentQty * group.bundle_quantity;

  return (
    <div
      className={cn(
        "rounded-md border p-3 space-y-3",
        hasUnavailable && "opacity-60",
      )}
    >
      {/* Bundle header */}
      <div className="flex items-center gap-3">
        <Checkbox
          checked={selected}
          disabled={hasUnavailable}
          onCheckedChange={(checked) =>
            onSelect(group.bundle_instance_id, checked === true)
          }
          aria-label={`Select bundle ${group.bundle_name}`}
        />
        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{group.bundle_name}</p>
            <Badge variant="secondary" className="text-xs">
              Bundle
            </Badge>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-sm font-semibold">
              ₱
              {group.bundle_price.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
              })}
            </span>
            <span className="text-xs text-muted-foreground">
              ×{group.bundle_quantity}
            </span>
            <span className="text-sm font-semibold ml-auto">
              ₱
              {group.bundle_subtotal.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive shrink-0"
          onClick={() =>
            onRemove(group.bundle_instance_id, totalBundleQuantity)
          }
          aria-label={`Remove bundle ${group.bundle_name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Bundle component items */}
      <div className="ml-7 space-y-1.5">
        {group.items.map((item) => (
          <CartBundleItemRow key={item.item_id} item={item} />
        ))}
      </div>

      {/* Bundle-level warnings */}
      {group.has_issues && (
        <div className="ml-7 space-y-1">
          {group.items.some((i) => i.is_unavailable) && (
            <CartIssueWarning
              type="unavailable"
              message="One or more items in this bundle are no longer available."
            />
          )}
          {group.items.some((i) => i.is_over_stock) && (
            <CartIssueWarning
              type="over_stock"
              message="One or more items in this bundle have limited stock."
            />
          )}
          {group.items.some((i) => i.price_changed) && (
            <CartIssueWarning
              type="price_changed"
              message="Price has changed for one or more items in this bundle."
            />
          )}
        </div>
      )}
    </div>
  );
}
