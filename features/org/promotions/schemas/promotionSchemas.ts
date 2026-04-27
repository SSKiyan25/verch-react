import { z } from "zod";

// =============================================================================
// Promotion Schemas
// Zod validation schemas for org promotions management
// Source: verch-enum-reference.md + verch-promotions-rpc-spec.md
// =============================================================================

// ---------------------------------------------------------------------------
// Enum schemas (from verch-enum-reference.md)
// ---------------------------------------------------------------------------

export const promotionStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "expired",
  "exhausted",
]);

export const promotionTriggerTypeSchema = z.enum(["voucher_code", "auto"]);

export const promotionDiscountTypeSchema = z.enum([
  "percentage",
  "fixed",
  "free_item",
]);

export const promotionTargetTypeSchema = z.enum([
  "product",
  "organization",
  "order",
]);

export const eligibilityRuleTypeSchema = z.enum([
  "verified_student",
  "active_member",
]);

// ---------------------------------------------------------------------------
// Eligibility Rule Schema
// ---------------------------------------------------------------------------

export const eligibilityRuleSchema = z.object({
  rule_type: eligibilityRuleTypeSchema,
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

// ---------------------------------------------------------------------------
// Create Promotion Schema
// ---------------------------------------------------------------------------

export const createPromotionSchema = z
  .object({
    name: z
      .string()
      .min(3, "Promotion name must be at least 3 characters")
      .max(255, "Promotion name must be under 255 characters"),
    description: z
      .string()
      .max(2000, "Description must be under 2000 characters")
      .nullable()
      .optional(),
    trigger_type: promotionTriggerTypeSchema.default("auto"),
    voucher_code: z
      .string()
      .min(4, "Voucher code must be at least 4 characters")
      .max(50, "Voucher code must be under 50 characters")
      .transform((val) => val.toUpperCase())
      .nullable()
      .optional(),
    target_type: promotionTargetTypeSchema.default("order"),
    discount_type: promotionDiscountTypeSchema.default("percentage"),
    discount_value: z
      .number()
      .min(0, "Discount value cannot be negative")
      .nullable()
      .optional(),
    minimum_order_amount: z
      .number()
      .min(0, "Minimum order amount cannot be negative")
      .default(0),
    total_uses_cap: z
      .number()
      .int()
      .min(1, "Total uses cap must be at least 1")
      .nullable()
      .optional(),
    starts_at: z.iso.datetime({ offset: true }).nullable().optional(),
    ends_at: z.iso.datetime({ offset: true }).nullable().optional(),
    target_product_ids: z.array(z.string().uuid()).nullable().optional(),
    gift_variation_id: z.string().uuid().nullable().optional(),
    gift_quantity: z
      .number()
      .int()
      .min(1, "Gift quantity must be at least 1")
      .default(1),
    eligibility_rules: z.array(eligibilityRuleSchema).default([]),
  })
  .refine(
    (data) => {
      // Voucher code required for voucher_code trigger type
      if (data.trigger_type === "voucher_code" && !data.voucher_code) {
        return false;
      }
      return true;
    },
    {
      message: "Voucher code is required for voucher_code trigger type",
      path: ["voucher_code"],
    },
  )
  .refine(
    (data) => {
      // Voucher code must be null for auto trigger type
      if (data.trigger_type === "auto" && data.voucher_code) {
        return false;
      }
      return true;
    },
    {
      message: "Voucher code must be empty for auto trigger type",
      path: ["voucher_code"],
    },
  )
  .refine(
    (data) => {
      // Discount value required for percentage and fixed types
      if (
        (data.discount_type === "percentage" ||
          data.discount_type === "fixed") &&
        data.discount_value == null
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Discount value is required for percentage and fixed discounts",
      path: ["discount_value"],
    },
  )
  .refine(
    (data) => {
      // Percentage must be 0-100
      if (
        data.discount_type === "percentage" &&
        data.discount_value != null &&
        (data.discount_value < 0 || data.discount_value > 100)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Percentage discount must be between 0 and 100",
      path: ["discount_value"],
    },
  )
  .refine(
    (data) => {
      // Fixed discount must be > 0
      if (
        data.discount_type === "fixed" &&
        data.discount_value != null &&
        data.discount_value <= 0
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Fixed discount must be greater than 0",
      path: ["discount_value"],
    },
  )
  .refine(
    (data) => {
      // Gift variation required for free_item type
      if (data.discount_type === "free_item" && !data.gift_variation_id) {
        return false;
      }
      return true;
    },
    {
      message: "Gift variation is required for free_item discount type",
      path: ["gift_variation_id"],
    },
  )
  .refine(
    (data) => {
      // Product targets required for product target type
      if (
        data.target_type === "product" &&
        (!data.target_product_ids || data.target_product_ids.length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "At least one product is required for product target type",
      path: ["target_product_ids"],
    },
  )
  .refine(
    (data) => {
      // End date must be after start date
      if (data.starts_at && data.ends_at && data.ends_at <= data.starts_at) {
        return false;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["ends_at"],
    },
  );

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;

// ---------------------------------------------------------------------------
// Update Promotion Schema
// ---------------------------------------------------------------------------

export const updatePromotionSchema = z
  .object({
    name: z
      .string()
      .min(3, "Promotion name must be at least 3 characters")
      .max(255, "Promotion name must be under 255 characters")
      .optional(),
    description: z
      .string()
      .max(2000, "Description must be under 2000 characters")
      .nullable()
      .optional(),
    trigger_type: promotionTriggerTypeSchema.optional(),
    voucher_code: z
      .string()
      .min(4, "Voucher code must be at least 4 characters")
      .max(50, "Voucher code must be under 50 characters")
      .transform((val) => val.toUpperCase())
      .nullable()
      .optional(),
    target_type: promotionTargetTypeSchema.optional(),
    discount_type: promotionDiscountTypeSchema.optional(),
    discount_value: z
      .number()
      .min(0, "Discount value cannot be negative")
      .nullable()
      .optional(),
    minimum_order_amount: z
      .number()
      .min(0, "Minimum order amount cannot be negative")
      .optional(),
    total_uses_cap: z
      .number()
      .int()
      .min(1, "Total uses cap must be at least 1")
      .nullable()
      .optional(),
    starts_at: z.iso.datetime({ offset: true }).nullable().optional(),
    ends_at: z.iso.datetime({ offset: true }).nullable().optional(),
    target_product_ids: z.array(z.string().uuid()).nullable().optional(),
    gift_variation_id: z.string().uuid().nullable().optional(),
    gift_quantity: z
      .number()
      .int()
      .min(1, "Gift quantity must be at least 1")
      .optional(),
    eligibility_rules: z.array(eligibilityRuleSchema).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.trigger_type === "voucher_code" && !data.voucher_code) {
        return false;
      }
      return true;
    },
    {
      message: "Voucher code is required for voucher_code trigger type",
      path: ["voucher_code"],
    },
  )
  .refine(
    (data) => {
      if (data.trigger_type === "auto" && data.voucher_code) {
        return false;
      }
      return true;
    },
    {
      message: "Voucher code must be empty for auto trigger type",
      path: ["voucher_code"],
    },
  )
  .refine(
    (data) => {
      if (
        (data.discount_type === "percentage" ||
          data.discount_type === "fixed") &&
        data.discount_value === null
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Discount value is required for percentage and fixed discounts",
      path: ["discount_value"],
    },
  )
  .refine(
    (data) => {
      if (
        data.discount_type === "percentage" &&
        data.discount_value != null &&
        (data.discount_value < 0 || data.discount_value > 100)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Percentage discount must be between 0 and 100",
      path: ["discount_value"],
    },
  )
  .refine(
    (data) => {
      if (
        data.discount_type === "fixed" &&
        data.discount_value != null &&
        data.discount_value <= 0
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Fixed discount must be greater than 0",
      path: ["discount_value"],
    },
  )
  .refine(
    (data) => {
      if (data.discount_type === "free_item" && !data.gift_variation_id) {
        return false;
      }
      return true;
    },
    {
      message: "Gift variation is required for free_item discount type",
      path: ["gift_variation_id"],
    },
  )
  .refine(
    (data) => {
      if (
        data.target_type === "product" &&
        (!data.target_product_ids || data.target_product_ids.length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "At least one product is required for product target type",
      path: ["target_product_ids"],
    },
  )
  .refine(
    (data) => {
      if (data.starts_at && data.ends_at && data.ends_at <= data.starts_at) {
        return false;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["ends_at"],
    },
  );

export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;

// ---------------------------------------------------------------------------
// Update Promotion Status Schema
// ---------------------------------------------------------------------------

export const updatePromotionStatusSchema = z.object({
  new_status: z.enum(["active", "paused"]),
});

export type UpdatePromotionStatusInput = z.infer<
  typeof updatePromotionStatusSchema
>;

// ---------------------------------------------------------------------------
// Duplicate Promotion Schema
// ---------------------------------------------------------------------------

export const duplicatePromotionSchema = z.object({
  new_name: z
    .string()
    .min(3, "Promotion name must be at least 3 characters")
    .max(255, "Promotion name must be under 255 characters")
    .nullable()
    .optional(),
});

export type DuplicatePromotionInput = z.infer<typeof duplicatePromotionSchema>;
