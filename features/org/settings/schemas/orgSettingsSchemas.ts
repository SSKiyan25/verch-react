import { z } from "zod";

// --- Day schema (internal, not exported) ---
const daySchema = z.object({
  isOpen: z.boolean(),
  openTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
    .optional(),
  closeTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format")
    .optional(),
});

// --- Exported schemas ---
export const basicInfoSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(255, "Organization name must be under 255 characters"),
  contact_email: z.string().email("Invalid email address"),
  phone_number: z.string().max(50).nullable().optional(),
  description: z
    .string()
    .max(2000, "Description must be under 2000 characters")
    .nullable()
    .optional(),
});

export const addressSchema = z.object({
  faculty: z.string().min(1, "Faculty is required").max(255),
  department: z.string().min(1, "Department is required").max(255),
  building: z.string().min(1, "Building is required").max(255),
  room: z.string().max(100).nullable().optional(),
  campus: z.string().max(255).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

export const businessHoursSchema = z.record(z.string(), daySchema);

export const orderSettingsSchema = z.object({
  autoAcceptOrders: z.boolean(),
  requireOrderApproval: z.boolean(),
});

export const publicVisibilitySchema = z.object({
  is_public: z.boolean(),
});

export const imagesSchema = z.object({
  logo_image_url: z.string().url().nullable().optional(),
  logo_image_path: z.string().nullable().optional(),
  cover_image_url: z.string().url().nullable().optional(),
  cover_image_path: z.string().nullable().optional(),
  images_url: z
    .array(
      z.object({
        url: z.string().url(),
        path: z.string(),
      }),
    )
    .optional(),
});

export const gcashSettingsSchema = z.object({
  number: z
    .string()
    .regex(
      /^(\+639|09)\d{9}$/,
      "Must be a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX)",
    ),
  accountName: z
    .string()
    .min(1, "Account name is required")
    .max(100, "Account name must be under 100 characters"),
  qrImagePath: z.string().nullable().optional(),
});

// --- Inferred types ---
export type BasicInfoInput = z.infer<typeof basicInfoSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;
export type OrderSettingsInput = z.infer<typeof orderSettingsSchema>;
export type PublicVisibilityInput = z.infer<typeof publicVisibilitySchema>;
export type ImagesInput = z.infer<typeof imagesSchema>;
export type GCashSettingsInput = z.infer<typeof gcashSettingsSchema>;
