import { z } from "zod";

export const PlaceOrderSchema = z.object({
  cartItemIds: z.array(z.string().uuid()).min(1, "No items selected"),
  paymentMethods: z.record(z.string().uuid(), z.enum(["cash", "gcash"])),
  voucherCodes: z
    .record(z.string().uuid(), z.string().min(1).max(50))
    .optional(),
  selectedPromotions: z
    .record(z.string().uuid(), z.string().uuid().nullable())
    .optional(),
  notes: z.record(z.string().uuid(), z.string().max(500)).optional(),
});

export const ApplyVoucherSchema = z.object({
  orgId: z.string().uuid(),
  voucherCode: z
    .string()
    .min(1)
    .max(50)
    .transform((s) => s.trim().toUpperCase()),
  cartItemIds: z.array(z.string().uuid()).min(1),
});

export const CancelOrderSchema = z.object({
  orderId: z.string().uuid(),
  cancellationReason: z.string().max(500).optional(),
});

export type PlaceOrderInput = z.infer<typeof PlaceOrderSchema>;
export type ApplyVoucherInput = z.infer<typeof ApplyVoucherSchema>;
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;
