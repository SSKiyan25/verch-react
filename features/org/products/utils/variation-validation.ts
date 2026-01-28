import { validateInputSecurity } from "@/lib/utils/security";

// Local validation result interface
export interface VariationValidationResult {
  isValid: boolean;
  error?: string;
}

// Validation rules specific to variations
export const variationRules = {
  variation_name: {
    validate: (value: string): VariationValidationResult => {
      if (!value || value.trim().length === 0) {
        return { isValid: false, error: "Variation name is required" };
      }

      if (value.length > 100) {
        return {
          isValid: false,
          error: "Variation name too long (max 100 characters)",
        };
      }

      // Use general security validation if available
      const securityResult = validateInputSecurity(value, {
        allowHTML: false,
        maxLength: 100,
        fieldType: "name",
      });

      if (securityResult.blocked) {
        return {
          isValid: false,
          error: "Invalid characters in variation name",
        };
      }

      return { isValid: true };
    },
  },

  sku: {
    validate: (value: string): VariationValidationResult => {
      if (!value || value.trim().length === 0) {
        return { isValid: true }; // Optional field
      }

      if (value.length > 50) {
        return { isValid: false, error: "SKU too long (max 50 characters)" };
      }

      // SKU pattern validation
      const skuPattern = /^[A-Z0-9\-_]+$/i;
      if (!skuPattern.test(value)) {
        return {
          isValid: false,
          error:
            "SKU can only contain letters, numbers, hyphens, and underscores",
        };
      }

      return { isValid: true };
    },
  },

  price: {
    validate: (value: number | string): VariationValidationResult => {
      const numValue = typeof value === "string" ? parseFloat(value) : value;

      if (isNaN(numValue)) {
        return { isValid: false, error: "Please enter a valid price" };
      }

      if (numValue < 0) {
        return { isValid: false, error: "Price cannot be negative" };
      }

      if (numValue > 999999.99) {
        return { isValid: false, error: "Price too high (max 999,999.99)" };
      }

      return { isValid: true };
    },
  },

  compare_at_price: {
    validate: (
      value: number | string | undefined
    ): VariationValidationResult => {
      if (value === undefined || value === "" || value === null) {
        return { isValid: true }; // Optional field
      }

      const numValue = typeof value === "string" ? parseFloat(value) : value;

      if (isNaN(numValue)) {
        return { isValid: false, error: "Please enter a valid compare price" };
      }

      if (numValue < 0) {
        return { isValid: false, error: "Compare price cannot be negative" };
      }

      if (numValue > 999999.99) {
        return {
          isValid: false,
          error: "Compare price too high (max 999,999.99)",
        };
      }

      return { isValid: true };
    },
  },

  stock_quantity: {
    validate: (value: number | string): VariationValidationResult => {
      const numValue = typeof value === "string" ? parseInt(value) : value;

      if (isNaN(numValue)) {
        return { isValid: false, error: "Please enter a valid stock quantity" };
      }

      if (numValue < 0) {
        return { isValid: false, error: "Stock quantity cannot be negative" };
      }

      if (numValue > 999999) {
        return {
          isValid: false,
          error: "Stock quantity too high (max 999,999)",
        };
      }

      return { isValid: true };
    },
  },

  pre_order_quantity: {
    validate: (
      value: number | string | undefined
    ): VariationValidationResult => {
      if (value === undefined || value === "" || value === null) {
        return { isValid: true }; // Optional field
      }

      const numValue = typeof value === "string" ? parseInt(value) : value;

      if (isNaN(numValue)) {
        return {
          isValid: false,
          error: "Please enter a valid pre-order quantity",
        };
      }

      if (numValue < 0) {
        return {
          isValid: false,
          error: "Pre-order quantity cannot be negative",
        };
      }

      if (numValue > 999999) {
        return {
          isValid: false,
          error: "Pre-order quantity too high (max 999,999)",
        };
      }

      return { isValid: true };
    },
  },

  attribute_key: {
    validate: (value: string): VariationValidationResult => {
      if (!value || value.trim().length === 0) {
        return { isValid: false, error: "Attribute key is required" };
      }

      if (value.length > 50) {
        return {
          isValid: false,
          error: "Attribute key too long (max 50 characters)",
        };
      }

      return { isValid: true };
    },
  },

  attribute_value: {
    validate: (value: string): VariationValidationResult => {
      if (!value || value.trim().length === 0) {
        return { isValid: false, error: "Attribute value is required" };
      }

      if (value.length > 100) {
        return {
          isValid: false,
          error: "Attribute value too long (max 100 characters)",
        };
      }

      return { isValid: true };
    },
  },
};

// Individual field validators
export const validateVariationName = (value: string) =>
  variationRules.variation_name.validate(value);
export const validateSku = (value: string) =>
  variationRules.sku.validate(value);
export const validatePrice = (value: number | string) =>
  variationRules.price.validate(value);
export const validateCompareAtPrice = (value: number | string | undefined) =>
  variationRules.compare_at_price.validate(value);
export const validateStockQuantity = (value: number | string) =>
  variationRules.stock_quantity.validate(value);
export const validatePreOrderQuantity = (value: number | string | undefined) =>
  variationRules.pre_order_quantity.validate(value);
export const validateAttributeKey = (value: string) =>
  variationRules.attribute_key.validate(value);
export const validateAttributeValue = (value: string) =>
  variationRules.attribute_value.validate(value);

// Validate attributes object
export const validateAttributes = (
  attributes: Record<string, string>
): VariationValidationResult => {
  for (const [key, value] of Object.entries(attributes)) {
    const keyResult = validateAttributeKey(key);
    if (!keyResult.isValid) {
      return { isValid: false, error: `Attribute key: ${keyResult.error}` };
    }

    const valueResult = validateAttributeValue(value);
    if (!valueResult.isValid) {
      return {
        isValid: false,
        error: `Attribute "${key}": ${valueResult.error}`,
      };
    }
  }
  return { isValid: true };
};

// Validate entire variation form
export interface VariationFormData {
  variation_name?: string;
  sku?: string;
  price: number;
  compare_at_price?: number;
  stock_quantity: number;
  pre_order_quantity?: number;
  attributes: Record<string, string>;
  is_available: boolean;
}

export interface VariationFormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateVariationForm = (
  data: VariationFormData
): VariationFormValidationResult => {
  const errors: Record<string, string> = {};

  // Validate each field
  const nameResult = validateVariationName(data.variation_name || "");
  if (!nameResult.isValid) errors.variation_name = nameResult.error!;

  if (data.sku) {
    const skuResult = validateSku(data.sku);
    if (!skuResult.isValid) errors.sku = skuResult.error!;
  }

  const priceResult = validatePrice(data.price);
  if (!priceResult.isValid) errors.price = priceResult.error!;

  if (data.compare_at_price !== undefined) {
    const compareResult = validateCompareAtPrice(data.compare_at_price);
    if (!compareResult.isValid) errors.compare_at_price = compareResult.error!;
  }

  const stockResult = validateStockQuantity(data.stock_quantity);
  if (!stockResult.isValid) errors.stock_quantity = stockResult.error!;

  if (data.pre_order_quantity !== undefined) {
    const preOrderResult = validatePreOrderQuantity(data.pre_order_quantity);
    if (!preOrderResult.isValid)
      errors.pre_order_quantity = preOrderResult.error!;
  }

  const attributesResult = validateAttributes(data.attributes);
  if (!attributesResult.isValid) errors.attributes = attributesResult.error!;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
