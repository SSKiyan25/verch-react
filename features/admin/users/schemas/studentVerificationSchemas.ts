import { z } from "zod";

export const verifyStudentSchema = z.object({
  studentInfoId: z.string().uuid("Invalid student info ID"),
});

export const rejectStudentSchema = z.object({
  studentInfoId: z.string().uuid("Invalid student info ID"),
  rejectionReason: z
    .string()
    .min(10, "Please provide a meaningful reason (at least 10 characters)")
    .max(500, "Rejection reason must not exceed 500 characters"),
});

export type VerifyStudentInput = z.infer<typeof verifyStudentSchema>;
export type RejectStudentInput = z.infer<typeof rejectStudentSchema>;
