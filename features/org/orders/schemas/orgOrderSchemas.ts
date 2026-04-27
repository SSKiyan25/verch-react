import { z } from "zod";

export const rejectProofSchema = z.object({
  orderId: z.string().uuid(),
  rejectionNote: z
    .string()
    .min(10, "Please provide a reason (at least 10 characters)")
    .max(500),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  newStatus: z.enum(["confirmed", "preparing", "ready"]),
});

export const cancelOrderSchema = z.object({
  orderId: z.string().uuid(),
  reason: z
    .string()
    .min(10, "Please provide a reason (at least 10 characters)")
    .max(500),
});

export const voidInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  voidReason: z
    .string()
    .min(10, "Please provide a reason (at least 10 characters)")
    .max(500),
});

export const confirmPaymentSchema = z.object({
  orderId: z.string().uuid(),
});

export const completeOrderSchema = z.object({
  orderId: z.string().uuid(),
});

export const reissueInvoiceSchema = z.object({
  orderId: z.string().uuid(),
});

export type RejectProofInput = z.infer<typeof rejectProofSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type VoidInvoiceInput = z.infer<typeof voidInvoiceSchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type CompleteOrderInput = z.infer<typeof completeOrderSchema>;
export type ReissueInvoiceInput = z.infer<typeof reissueInvoiceSchema>;
