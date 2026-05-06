"use client";

import { MapPin, Store as StoreIcon } from "lucide-react";
import type { CartOrg } from "@/lib/supabase/queries/user/cart";
import type { ProductPromotionsMap } from "@/lib/types/public-promotions";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CartItemRow } from "./CartItemRow";
import { CartBundleGroup } from "./CartBundleGroup";

interface CartOrgSectionProps {
  org: CartOrg;
  selectedItems: Set<string>;
  quantities: Record<string, number>;
  onSelectItem: (id: string, checked: boolean) => void;
  onSelectBundle: (bundleInstanceId: string, checked: boolean) => void;
  onSelectAllOrg: (orgId: string, checked: boolean) => void;
  onQuantityChange: (itemId: string, newQty: number, delta: number) => void;
  onRemoveItem: (itemId: string, quantity: number) => void;
  onRemoveBundle: (bundleInstanceId: string, totalQty: number) => void;
  onOpenFulfillment: (org: CartOrg) => void;
  isAllOrgSelected: boolean;
  orgSelectedSubtotal: number;
  promotionsMap: ProductPromotionsMap;
}

export function CartOrgSection({
  org,
  selectedItems,
  quantities,
  onSelectItem,
  onSelectBundle,
  onSelectAllOrg,
  onQuantityChange,
  onRemoveItem,
  onRemoveBundle,
  onOpenFulfillment,
  isAllOrgSelected,
  orgSelectedSubtotal,
  promotionsMap,
}: CartOrgSectionProps) {
  const fulfillmentLabel =
    org.fulfillment_method === "delivery" ? "Delivery" : "Pickup";

  return (
    <div className="rounded-lg border hover:shadow-sm transition-shadow duration-200">
      {/* Org header */}
      <div className="flex items-center justify-between gap-3 p-4 bg-muted/30">
        <div className="flex items-center gap-3 min-w-0">
          <Checkbox
            checked={isAllOrgSelected}
            onCheckedChange={(checked) =>
              onSelectAllOrg(org.organization_id, checked === true)
            }
            aria-label={`Select all items from ${org.organization_name}`}
          />
          <StoreIcon className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold truncate">
            {org.organization_name}
          </span>
        </div>
        <div className="relative group">
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 cursor-disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200"
            onClick={() => onOpenFulfillment(org)}
            disabled
            aria-label="Fulfillment method (coming soon)"
          >
            {org.fulfillment_method === "delivery" ? (
              <MapPin className="h-3.5 w-3.5" />
            ) : (
              <StoreIcon className="h-3.5 w-3.5" />
            )}
            {fulfillmentLabel}
          </Button>
          <span
            className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max -translate-x-1/2 rounded bg-black px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            role="tooltip"
          >
            Will be available soon
          </span>
        </div>
      </div>

      <Separator />

      {/* Items */}
      <div className="divide-y">
        {org.standalone_items.map((item) => {
          // Get best eligible promotion for this product (if any)
          const productPromotions = promotionsMap.get(item.product_id) ?? [];
          const promotion =
            productPromotions.find((p) => p.isEligible) ??
            productPromotions[0] ??
            null;

          return (
            <CartItemRow
              key={item.item_id}
              item={item}
              quantity={quantities[item.item_id] ?? item.quantity}
              selected={selectedItems.has(item.item_id)}
              onSelect={onSelectItem}
              onQuantityChange={onQuantityChange}
              onRemove={onRemoveItem}
              promotion={promotion}
            />
          );
        })}
        {org.bundle_groups.map((group) => (
          <div key={group.bundle_instance_id} className="p-3">
            <CartBundleGroup
              group={group}
              selected={selectedItems.has(group.bundle_instance_id)}
              onSelect={onSelectBundle}
              onRemove={onRemoveBundle}
            />
          </div>
        ))}
      </div>

      {/* Org subtotal */}
      <Separator />
      <div className="flex items-center justify-end gap-2 p-4">
        <span className="text-sm text-muted-foreground">Subtotal:</span>
        <span className="text-sm font-semibold">
          ₱
          {orgSelectedSubtotal.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}
