import { z } from "zod";

export const suspendUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  reason: z
    .string()
    .min(10, "Please provide a meaningful reason (at least 10 characters)")
    .max(500, "Suspension reason must not exceed 500 characters"),
});

export const unsuspendUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export const resetPasswordSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
export type UnsuspendUserInput = z.infer<typeof unsuspendUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
