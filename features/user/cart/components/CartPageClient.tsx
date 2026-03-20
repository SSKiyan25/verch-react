"use client";

import { useState } from "react";
import type { CartSummary } from "@/lib/supabase/queries/user/cart";
import type { UserAddress } from "@/lib/supabase/queries/user-settings";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCart } from "../hooks/useCart";
import { CartOrgSection } from "./CartOrgSection";
import { CartOrderSummary } from "./CartOrderSummary";
import { CartFulfillmentDrawer } from "./CartFulfillmentDrawer";
import { CartEmptyState } from "./CartEmptyState";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CartPageClientProps {
  initialCart: CartSummary;
  addresses: UserAddress[];
  userId: string;
}

export function CartPageClient({
  initialCart,
  addresses,
}: CartPageClientProps) {
  const {
    filteredCart,
    selectedItems,
    quantities,
    fulfillmentDrawerOrg,
    isAllSelected,
    orgSubtotals,
    totalSelectedAmount,
    totalSelectableCount,
    disabledReasons,
    checkoutItemIds,
    handleSelectItem,
    handleSelectBundle,
    handleSelectAllOrg,
    handleSelectAll,
    isAllOrgSelected,
    handleQuantityChange,
    handleRemoveItem,
    handleRemoveBundle,
    handleFulfillmentUpdated,
    setFulfillmentDrawerOrg,
  } = useCart(initialCart);

  // ─── Pending remove confirmation ───────────────────────────────────────
  const [pendingRemove, setPendingRemove] = useState<{
    type: "item" | "bundle";
    id: string;
    quantity: number;
  } | null>(null);

  function requestRemoveItem(itemId: string, quantity: number) {
    setPendingRemove({ type: "item", id: itemId, quantity });
  }

  function requestRemoveBundle(bundleInstanceId: string, totalQty: number) {
    setPendingRemove({
      type: "bundle",
      id: bundleInstanceId,
      quantity: totalQty,
    });
  }

  function confirmRemove() {
    if (!pendingRemove) return;
    if (pendingRemove.type === "item") {
      handleRemoveItem(pendingRemove.id, pendingRemove.quantity);
    } else {
      handleRemoveBundle(pendingRemove.id, pendingRemove.quantity);
    }
    setPendingRemove(null);
  }

  console.log("Filtered cart:", filteredCart);

  // ─── Render ────────────────────────────────────────────────────────────

  if (filteredCart.orgs.length === 0) {
    return <CartEmptyState />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cart</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left column — cart items */}
        <div className="flex-1 space-y-4">
          {/* Global select all */}
          <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={(checked) => handleSelectAll(checked === true)}
              aria-label="Select all items"
            />
            <span className="text-sm font-medium">Select all</span>
          </div>

          {/* Org sections */}
          {filteredCart.orgs.map((org) => (
            <CartOrgSection
              key={org.organization_id}
              org={org}
              selectedItems={selectedItems}
              quantities={quantities}
              onSelectItem={handleSelectItem}
              onSelectBundle={handleSelectBundle}
              onSelectAllOrg={handleSelectAllOrg}
              onQuantityChange={handleQuantityChange}
              onRemoveItem={requestRemoveItem}
              onRemoveBundle={requestRemoveBundle}
              onOpenFulfillment={setFulfillmentDrawerOrg}
              isAllOrgSelected={isAllOrgSelected(org)}
              orgSelectedSubtotal={
                orgSubtotals.find((o) => o.orgName === org.organization_name)
                  ?.subtotal ?? 0
              }
            />
          ))}
        </div>

        {/* Right column — order summary */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-20">
            <CartOrderSummary
              orgSubtotals={orgSubtotals}
              selectedCount={selectedItems.size}
              totalCount={totalSelectableCount}
              total={totalSelectedAmount}
              disabledReasons={disabledReasons}
              checkoutHref={`/user/checkout?items=${checkoutItemIds.join(",")}`}
            />
          </div>
        </div>
      </div>

      {/* Remove confirmation dialog */}
      <ConfirmDialog
        isOpen={pendingRemove !== null}
        onClose={() => setPendingRemove(null)}
        onConfirm={confirmRemove}
        title="Remove item"
        description="Are you sure you want to remove this item from your cart?"
        confirmText="Remove"
        destructive
      />

      {/* Fulfillment drawer */}
      <CartFulfillmentDrawer
        org={fulfillmentDrawerOrg}
        addresses={addresses}
        open={fulfillmentDrawerOrg !== null}
        onOpenChange={(open) => {
          if (!open) setFulfillmentDrawerOrg(null);
        }}
        onFulfillmentUpdated={handleFulfillmentUpdated}
      />
    </div>
  );
}
