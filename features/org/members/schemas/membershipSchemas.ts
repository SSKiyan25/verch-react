import { z } from "zod";

export const approveMembershipSchema = z.object({
  membershipId: z.string().uuid("Invalid membership ID"),
  position: z
    .string()
    .max(100, "Position must not exceed 100 characters")
    .optional(),
});

export const rejectMembershipSchema = z.object({
  membershipId: z.string().uuid("Invalid membership ID"),
  rejectionReason: z
    .string()
    .min(10, "Please provide a meaningful reason (at least 10 characters)")
    .max(500, "Rejection reason must not exceed 500 characters"),
});

export const revokeMembershipSchema = z.object({
  membershipId: z.string().uuid("Invalid membership ID"),
  reason: z
    .string()
    .max(500, "Reason must not exceed 500 characters")
    .optional(),
});

export type ApproveMembershipInput = z.infer<typeof approveMembershipSchema>;
export type RejectMembershipInput = z.infer<typeof rejectMembershipSchema>;
export type RevokeMembershipInput = z.infer<typeof revokeMembershipSchema>;
