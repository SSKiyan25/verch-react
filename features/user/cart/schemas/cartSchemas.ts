import { z } from "zod";

export const addToCartSchema = z.object({
  variation_id: z.string().uuid("Invalid variation ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  is_pre_order: z.boolean().default(false),
});

export const updateCartItemSchema = z.object({
  item_id: z.string().uuid("Invalid item ID"),
  variation_id: z.string().uuid("Invalid variation ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const removeFromCartSchema = z.object({
  item_id: z.string().uuid("Invalid item ID"),
});

export const addBundleToCartSchema = z.object({
  bundle_id: z.string().uuid("Invalid bundle ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  // Only required for configurable bundles — empty array for fixed bundles
  selections: z
    .array(
      z.object({
        option_group_id: z.string().uuid("Invalid option group ID"),
        variation_id: z.string().uuid("Invalid variation ID"),
      }),
    )
    .default([]),
});

export const removeBundleFromCartSchema = z.object({
  instance_id: z.string().uuid("Invalid bundle instance ID"),
});

export const setCartFulfillmentSchema = z
  .object({
    organization_id: z.string().uuid("Invalid organization ID"),
    fulfillment_method: z.enum(["pickup", "delivery"]),
    delivery_address_id: z.string().uuid("Invalid address ID").nullable(),
  })
  .refine(
    (data) =>
      data.fulfillment_method === "pickup" || data.delivery_address_id !== null,
    {
      message: "A delivery address is required when method is delivery",
      path: ["delivery_address_id"],
    },
  );

// Shared return type across all cart actions
export type CartActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
