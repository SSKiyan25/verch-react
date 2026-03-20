"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addToCartAction } from "@/features/user/cart/actions/addToCartAction";
import { useCartStore } from "@/lib/stores/cart-store";
import type { UpsertCartItemResult } from "@/lib/supabase/queries/user/cart";

export type AddToCartSuccess = {
  result: UpsertCartItemResult;
  variationId: string;
  quantity: number;
};

type UseAddToCartReturn = {
  addToCart: (
    variationId: string,
    quantity: number,
    isPreOrder?: boolean,
  ) => Promise<AddToCartSuccess | null>;
  isPending: boolean;
};

export function useAddToCart(isAuthenticated: boolean): UseAddToCartReturn {
  const router = useRouter();
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const [isPending, setIsPending] = useState(false);

  const addToCart = useCallback(
    async (
      variationId: string,
      quantity: number,
      isPreOrder: boolean = false,
    ): Promise<AddToCartSuccess | null> => {
      if (!isAuthenticated) {
        router.push("/login");
        return null;
      }

      setIsPending(true);

      // Optimistic update — increment badge BEFORE action resolves
      increment(quantity);

      try {
        const result = await addToCartAction({
          variation_id: variationId,
          quantity,
          is_pre_order: isPreOrder,
        });

        if (!result.success) {
          // Rollback optimistic update
          decrement(quantity);
          toast.error(result.error || "Failed to add item to cart");
          return null;
        }

        return { result: result.data, variationId, quantity };
      } catch {
        decrement(quantity);
        toast.error("Something went wrong. Please try again.");
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [isAuthenticated, router, increment, decrement],
  );

  return { addToCart, isPending };
}
