import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { CartSummary, CartOrg } from "@/lib/supabase/queries/user/cart";
import { useCartStore } from "@/lib/stores/cart-store";
import { updateCartItemAction } from "@/features/user/cart/actions/updateCartItemAction";
import { removeFromCartAction } from "@/features/user/cart/actions/removeFromCartAction";
import { removeBundleFromCartAction } from "@/features/user/cart/actions/removeBundleFromCartAction";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function collectAllSelectableIds(cart: CartSummary) {
  const ids = new Set<string>();
  for (const org of cart.orgs) {
    for (const item of org.standalone_items) {
      if (!item.is_unavailable) ids.add(item.item_id);
    }
    for (const group of org.bundle_groups) {
      const hasUnavailable = group.items.some((i) => i.is_unavailable);
      if (!hasUnavailable) ids.add(group.bundle_instance_id);
    }
  }
  return ids;
}

function buildQuantityMap(cart: CartSummary): Record<string, number> {
  const map: Record<string, number> = {};
  for (const org of cart.orgs) {
    for (const item of org.standalone_items) {
      map[item.item_id] = item.quantity;
    }
  }
  return map;
}

function countTotalSelectableItems(cart: CartSummary): number {
  let count = 0;
  for (const org of cart.orgs) {
    count += org.standalone_items.length;
    count += org.bundle_groups.length;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCart(initialCart: CartSummary) {
  // ─── Local cart state (optimistic) ─────────────────────────────────────
  const [cart, setCart] = useState<CartSummary>(initialCart);

  // ─── Selection state — select all selectable by default ────────────────
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() =>
    collectAllSelectableIds(initialCart),
  );

  // ─── Optimistic quantities: item_id → quantity ─────────────────────────
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    buildQuantityMap(initialCart),
  );

  // ─── Debounce refs — one per item ID ───────────────────────────────────
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  // ─── Fulfillment drawer ────────────────────────────────────────────────
  const [fulfillmentDrawerOrg, setFulfillmentDrawerOrg] =
    useState<CartOrg | null>(null);

  // ─── Removed items/bundles (for optimistic removal) ────────────────────
  const [removedItemIds, setRemovedItemIds] = useState<Set<string>>(new Set());
  const [removedBundleIds, setRemovedBundleIds] = useState<Set<string>>(
    new Set(),
  );

  // ─── Zustand cart badge sync ───────────────────────────────────────────
  const setCount = useCartStore((s) => s.setCount);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);

  useEffect(() => {
    setCount(initialCart.total_items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Derived filtered cart (after optimistic removals) ─────────────────
  const filteredCart = useMemo<CartSummary>(() => {
    const orgs = cart.orgs
      .map((org) => {
        const standaloneItems = org.standalone_items.filter(
          (i) => !removedItemIds.has(i.item_id),
        );
        const bundleGroups = org.bundle_groups.filter(
          (g) => !removedBundleIds.has(g.bundle_instance_id),
        );

        const orgSubtotal =
          standaloneItems.reduce(
            (sum, item) =>
              sum +
              item.current_price * (quantities[item.item_id] ?? item.quantity),
            0,
          ) + bundleGroups.reduce((sum, g) => sum + g.bundle_subtotal, 0);

        return {
          ...org,
          standalone_items: standaloneItems,
          bundle_groups: bundleGroups,
          org_subtotal: orgSubtotal,
        };
      })
      .filter(
        (org) =>
          org.standalone_items.length > 0 || org.bundle_groups.length > 0,
      );

    const totalItems = orgs.reduce(
      (sum, org) =>
        sum +
        org.standalone_items.reduce(
          (s, i) => s + (quantities[i.item_id] ?? i.quantity),
          0,
        ) +
        org.bundle_groups.reduce(
          (s, g) => s + g.items.reduce((si, i) => si + i.quantity, 0),
          0,
        ),
      0,
    );

    return {
      orgs,
      total_items: totalItems,
      total_amount: orgs.reduce((s, o) => s + o.org_subtotal, 0),
      has_any_issues: orgs.some((o) => o.has_issues),
    };
  }, [cart, removedItemIds, removedBundleIds, quantities]);

  // ─── Selection helpers ─────────────────────────────────────────────────

  const handleSelectItem = useCallback((itemId: string, checked: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }, []);

  const handleSelectBundle = useCallback(
    (bundleInstanceId: string, checked: boolean) => {
      setSelectedItems((prev) => {
        const next = new Set(prev);
        if (checked) next.add(bundleInstanceId);
        else next.delete(bundleInstanceId);
        return next;
      });
    },
    [],
  );

  const handleSelectAllOrg = useCallback(
    (orgId: string, checked: boolean) => {
      const org = filteredCart.orgs.find((o) => o.organization_id === orgId);
      if (!org) return;
      setSelectedItems((prev) => {
        const next = new Set(prev);
        for (const item of org.standalone_items) {
          if (item.is_unavailable) continue;
          if (checked) next.add(item.item_id);
          else next.delete(item.item_id);
        }
        for (const group of org.bundle_groups) {
          const hasUnavailable = group.items.some((i) => i.is_unavailable);
          if (hasUnavailable) continue;
          if (checked) next.add(group.bundle_instance_id);
          else next.delete(group.bundle_instance_id);
        }
        return next;
      });
    },
    [filteredCart.orgs],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedItems(collectAllSelectableIds(filteredCart));
      } else {
        setSelectedItems(new Set());
      }
    },
    [filteredCart],
  );

  const isAllOrgSelected = useCallback(
    (org: CartOrg): boolean => {
      for (const item of org.standalone_items) {
        if (item.is_unavailable) continue;
        if (!selectedItems.has(item.item_id)) return false;
      }
      for (const group of org.bundle_groups) {
        const hasUnavailable = group.items.some((i) => i.is_unavailable);
        if (hasUnavailable) continue;
        if (!selectedItems.has(group.bundle_instance_id)) return false;
      }
      return true;
    },
    [selectedItems],
  );

  const allSelectableIds = useMemo(
    () => collectAllSelectableIds(filteredCart),
    [filteredCart],
  );
  const isAllSelected =
    allSelectableIds.size > 0 &&
    [...allSelectableIds].every((id) => selectedItems.has(id));

  // ─── Quantity change handler (optimistic + debounced sync) ─────────────

  const handleQuantityChange = useCallback(
    (itemId: string, newQuantity: number, delta: number) => {
      // 1. Update quantities state immediately
      setQuantities((prev) => ({ ...prev, [itemId]: newQuantity }));

      // 2. Update badge
      if (delta > 0) increment(delta);
      else if (delta < 0) decrement(Math.abs(delta));

      // 3. Clear existing debounce for this item
      if (debounceRefs.current[itemId]) {
        clearTimeout(debounceRefs.current[itemId]);
      }

      // 4. Find the item to get variation_id
      let variationId: string | null = null;
      for (const org of cart.orgs) {
        const found = org.standalone_items.find((i) => i.item_id === itemId);
        if (found) {
          variationId = found.variation_id;
          break;
        }
      }

      if (!variationId) return;

      const prevQuantity = quantities[itemId] ?? newQuantity - delta;

      // 5. Debounce 600ms → call server action
      debounceRefs.current[itemId] = setTimeout(async () => {
        const result = await updateCartItemAction({
          item_id: itemId,
          variation_id: variationId,
          quantity: newQuantity,
        });

        if (!result.success) {
          // Revert optimistic update
          setQuantities((prev) => ({ ...prev, [itemId]: prevQuantity }));
          if (delta > 0) decrement(delta);
          else if (delta < 0) increment(Math.abs(delta));
          toast.error(result.error);
        }
      }, 600);
    },
    [cart.orgs, quantities, increment, decrement],
  );

  // ─── Remove item handler ──────────────────────────────────────────────

  const handleRemoveItem = useCallback(
    async (itemId: string, quantity: number) => {
      // Optimistic: hide item + update badge
      setRemovedItemIds((prev) => new Set(prev).add(itemId));
      setSelectedItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      decrement(quantity);

      const result = await removeFromCartAction({ item_id: itemId });

      if (!result.success) {
        // Revert
        setRemovedItemIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        increment(quantity);
        toast.error(result.error);
      } else {
        toast.success("Item removed from cart.");
      }
    },
    [increment, decrement],
  );

  // ─── Remove bundle handler ────────────────────────────────────────────

  const handleRemoveBundle = useCallback(
    async (bundleInstanceId: string, totalQty: number) => {
      setRemovedBundleIds((prev) => new Set(prev).add(bundleInstanceId));
      setSelectedItems((prev) => {
        const next = new Set(prev);
        next.delete(bundleInstanceId);
        return next;
      });
      decrement(totalQty);

      const result = await removeBundleFromCartAction({
        instance_id: bundleInstanceId,
      });

      if (!result.success) {
        setRemovedBundleIds((prev) => {
          const next = new Set(prev);
          next.delete(bundleInstanceId);
          return next;
        });
        increment(totalQty);
        toast.error(result.error);
      } else {
        toast.success("Bundle removed from cart.");
      }
    },
    [increment, decrement],
  );

  // ─── Fulfillment handler ──────────────────────────────────────────────

  const handleFulfillmentUpdated = useCallback(
    (
      orgId: string,
      method: "pickup" | "delivery",
      addressId: string | null,
    ) => {
      setCart((prev) => ({
        ...prev,
        orgs: prev.orgs.map((org) =>
          org.organization_id === orgId
            ? {
                ...org,
                fulfillment_method: method,
                delivery_address_id: addressId,
              }
            : org,
        ),
      }));
    },
    [],
  );

  // ─── Compute order summary data ───────────────────────────────────────

  const orgSubtotals = useMemo(() => {
    return filteredCart.orgs
      .map((org) => {
        const standaloneSubtotal = org.standalone_items.reduce((sum, item) => {
          if (!selectedItems.has(item.item_id)) return sum;
          return (
            sum +
            item.current_price * (quantities[item.item_id] ?? item.quantity)
          );
        }, 0);

        const bundleSubtotal = org.bundle_groups.reduce((sum, group) => {
          if (!selectedItems.has(group.bundle_instance_id)) return sum;
          return sum + group.bundle_subtotal;
        }, 0);

        return {
          orgName: org.organization_name,
          subtotal: standaloneSubtotal + bundleSubtotal,
        };
      })
      .filter((o) => o.subtotal > 0);
  }, [filteredCart.orgs, selectedItems, quantities]);

  const totalSelectedAmount = orgSubtotals.reduce(
    (sum, o) => sum + o.subtotal,
    0,
  );
  const totalSelectableCount = countTotalSelectableItems(filteredCart);

  // ─── Checkout item IDs (actual cart_items.id values for selected items) ──
  // bundle groups expand to their individual component item IDs
  const checkoutItemIds = useMemo(() => {
    const ids: string[] = [];
    for (const org of filteredCart.orgs) {
      for (const item of org.standalone_items) {
        if (selectedItems.has(item.item_id)) ids.push(item.item_id);
      }
      for (const group of org.bundle_groups) {
        if (selectedItems.has(group.bundle_instance_id)) {
          for (const item of group.items) {
            ids.push(item.item_id);
          }
        }
      }
    }
    return ids;
  }, [filteredCart.orgs, selectedItems]);

  // ─── Checkout disabled reasons ─────────────────────────────────────────

  const disabledReasons = useMemo(() => {
    const reasons: string[] = [];

    let unavailableCount = 0;
    let overStockCount = 0;
    let priceChangedCount = 0;

    for (const org of filteredCart.orgs) {
      for (const item of org.standalone_items) {
        if (!selectedItems.has(item.item_id)) continue;
        if (item.is_unavailable) unavailableCount++;
        if (item.is_over_stock) overStockCount++;
        if (item.price_changed) priceChangedCount++;
      }
      for (const group of org.bundle_groups) {
        if (!selectedItems.has(group.bundle_instance_id)) continue;
        if (group.has_issues) {
          for (const item of group.items) {
            if (item.is_unavailable) unavailableCount++;
            if (item.is_over_stock) overStockCount++;
            if (item.price_changed) priceChangedCount++;
          }
        }
      }
    }

    if (unavailableCount > 0)
      reasons.push(
        `${unavailableCount} item${unavailableCount > 1 ? "s are" : " is"} unavailable.`,
      );
    if (overStockCount > 0)
      reasons.push(
        `${overStockCount} item${overStockCount > 1 ? "s exceed" : " exceeds"} available stock.`,
      );
    if (priceChangedCount > 0)
      reasons.push(
        `${priceChangedCount} item${priceChangedCount > 1 ? "s have" : " has"} a price change that needs review.`,
      );

    return reasons;
  }, [filteredCart.orgs, selectedItems]);

  // ─── Return ────────────────────────────────────────────────────────────

  return {
    // State
    filteredCart,
    selectedItems,
    quantities,
    fulfillmentDrawerOrg,
    isAllSelected,

    // Computed
    orgSubtotals,
    totalSelectedAmount,
    totalSelectableCount,
    disabledReasons,
    checkoutItemIds,

    // Selection handlers
    handleSelectItem,
    handleSelectBundle,
    handleSelectAllOrg,
    handleSelectAll,
    isAllOrgSelected,

    // Mutation handlers
    handleQuantityChange,
    handleRemoveItem,
    handleRemoveBundle,
    handleFulfillmentUpdated,

    // Drawer control
    setFulfillmentDrawerOrg,
  };
}
