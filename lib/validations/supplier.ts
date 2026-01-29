import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  contact_email: z
    .string()
    .email("Invalid email address")
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
    })
    .optional()
    .nullable(),
  links: z
    .array(
      z.object({
        id: z.string().optional(), // for UI keys
        type: z.enum(["website", "facebook", "instagram", "linkedin", "other"]),
        url: z.string().url("Invalid URL"),
      })
    )
    .optional()
    .nullable(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
