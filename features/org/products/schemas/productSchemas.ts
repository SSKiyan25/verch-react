import { z } from "zod";

// =============================================================================
// Product Schemas
// =============================================================================

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  description: z.string().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  search_keywords: z.array(z.string()).optional().default([]),
  can_pre_order: z.boolean().optional().default(false),
  featured_photo_url: z.string().url().nullable().optional(),
  photo_urls: z.array(z.string().url()).optional().default([]),
  variations: z
    .array(
      z.object({
        price: z.number().min(0, "Price cannot be negative"),
        variation_name: z.string().nullable().optional(),
        sku: z
          .string()
          .regex(
            /^[A-Z0-9\-_]+$/i,
            "SKU can only contain letters, numbers, hyphens, and underscores",
          )
          .max(50, "SKU too long (max 50 characters)")
          .nullable()
          .optional(),
        attributes: z.record(z.string(), z.unknown()).optional().default({}),
        compare_at_price: z
          .number()
          .min(0, "Compare price cannot be negative")
          .nullable()
          .optional(),
        stock_quantity: z
          .number()
          .int()
          .min(0, "Stock quantity cannot be negative")
          .optional()
          .default(0),
        is_available: z.boolean().optional().default(true),
      }),
    )
    .optional()
    .default([]),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
    supplier_id: z.string().uuid().nullable().optional(),
    search_keywords: z.array(z.string()).optional(),
    status: z
      .enum(["draft", "pending_approval", "published", "archived", "rejected"])
      .optional(),
    can_pre_order: z.boolean().optional(),
    is_approved: z.boolean().optional(),
    is_archived: z.boolean().optional(),
    is_discounted: z.boolean().optional(),
    discount_type: z.enum(["none", "percentage", "fixed"]).optional(),
    discount_target: z.string().nullable().optional(),
    discount_value: z.number().min(0).nullable().optional(),
    featured_photo_url: z.string().nullable().optional(),
    photo_urls: z.array(z.string()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// =============================================================================
// Variation Schemas
// =============================================================================

export const createVariationSchema = z.object({
  variation_name: z.string().nullable().optional(),
  sku: z
    .string()
    .regex(
      /^[A-Z0-9\-_]+$/i,
      "SKU can only contain letters, numbers, hyphens, and underscores",
    )
    .max(50, "SKU too long (max 50 characters)")
    .nullable()
    .optional(),
  attributes: z.record(z.string(), z.unknown()).optional().default({}),
  price: z.number().min(0, "Price cannot be negative"),
  compare_at_price: z
    .number()
    .min(0, "Compare price cannot be negative")
    .nullable()
    .optional(),
  stock_quantity: z
    .number()
    .int()
    .min(0, "Stock quantity cannot be negative")
    .optional()
    .default(0),
  is_available: z.boolean().optional().default(true),
});

export type CreateVariationInput = z.infer<typeof createVariationSchema>;

export const updateVariationSchema = z
  .object({
    variation_name: z.string().nullable().optional(),
    sku: z
      .string()
      .regex(
        /^[A-Z0-9\-_]+$/i,
        "SKU can only contain letters, numbers, hyphens, and underscores",
      )
      .max(50, "SKU too long (max 50 characters)")
      .nullable()
      .optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    price: z.number().min(0, "Price cannot be negative").optional(),
    compare_at_price: z
      .number()
      .min(0, "Compare price cannot be negative")
      .nullable()
      .optional(),
    is_available: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateVariationInput = z.infer<typeof updateVariationSchema>;

// =============================================================================
// Stock Adjustment Schema
// =============================================================================

export const adjustStockBatchSchema = z.object({
  adjustments: z
    .array(
      z.object({
        variation_id: z.string().uuid(),
        quantity_change: z
          .number()
          .int()
          .refine((val) => val !== 0, {
            message: "Quantity change cannot be zero",
          }),
        action: z.enum(["add", "remove", "adjust", "return"]),
        remarks: z.string().nullable().optional(),
      }),
    )
    .min(1, "At least one adjustment is required"),
});

export type AdjustStockBatchInput = z.infer<typeof adjustStockBatchSchema>;

// =============================================================================
// Supplier Schemas
// =============================================================================

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(255),
  description: z.string().nullable().optional(),
  contact_number: z
    .string()
    .min(7)
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format")
    .nullable()
    .optional(),
  contact_email: z.string().email("Invalid email format").nullable().optional(),
  address: z.record(z.string(), z.unknown()).optional().default({}),
  links: z.array(z.unknown()).optional().default([]),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    contact_number: z
      .string()
      .min(7)
      .max(20)
      .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format")
      .nullable()
      .optional(),
    contact_email: z
      .string()
      .email("Invalid email format")
      .nullable()
      .optional(),
    address: z.record(z.string(), z.unknown()).optional(),
    links: z.array(z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const linkSupplierSchema = z.object({
  supplier_id: z.string().uuid().nullable().optional(),
});

export type LinkSupplierInput = z.infer<typeof linkSupplierSchema>;
