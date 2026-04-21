"use client";

import { useValidation } from "@/lib/hooks/use-validation";
import { CreateProductData, ProductStatus } from "@/lib/types/product";
import {
  sanitizeInput,
  VALIDATION_PATTERNS,
} from "@/lib/hooks/use-input-validation";

// Define validation rules for all CreateProductData properties
const productValidationRules = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 200,
    custom: (value: string) => {
      if (value && value.length < 2) return "Product name too short";
      if (value && !VALIDATION_PATTERNS.noSpecialChars.test(value)) {
        return "Product name contains invalid characters";
      }
      return null;
    },
  },
  description: {
    required: false,
    maxLength: 1000,
    custom: (value: string) => {
      if (value && value.length > 1000) return "Description too long";
      return null;
    },
  },
  category_id: {
    required: true,
  },
  status: {
    required: false,
    custom: (value: ProductStatus) => {
      const validStatuses = [
        "draft",
        "published",
        "pending_approval",
        "archived",
      ];
      if (value && !validStatuses.includes(value)) {
        return "Invalid status";
      }
      return null;
    },
  },
  search_keywords: {
    required: false,
    maxLength: 10,
    custom: (keywords: string[]) => {
      if (keywords && keywords.length > 10) {
        return "Maximum 10 keywords allowed";
      }
      if (keywords && keywords.some((k) => k.length < 2)) {
        return "Each keyword must be at least 2 characters";
      }
      if (keywords && keywords.some((k) => k.length > 50)) {
        return "Each keyword must be less than 50 characters";
      }
      return null;
    },
  },
  featured_photo_url: {
    required: true,
    custom: (value: string) => {
      if (value && !VALIDATION_PATTERNS.url.test(value)) {
        return "Invalid URL format";
      }
      return null;
    },
  },
  photo_urls: {
    required: false,
    maxLength: 10,
    custom: (urls: string[]) => {
      if (urls && urls.length > 10) {
        return "Maximum 10 photos allowed";
      }
      if (urls && urls.some((url) => !VALIDATION_PATTERNS.url.test(url))) {
        return "Invalid URL format in photo URLs";
      }
      return null;
    },
  },
  can_pre_order: {
    required: false,
  },
  discount_type: {
    required: false,
    custom: (value: string) => {
      const validTypes = ["none", "percentage", "fixed"];
      if (value && !validTypes.includes(value)) {
        return "Invalid discount type";
      }
      return null;
    },
  },
  discount_target: {
    required: false,
  },
  discount_value: {
    required: false,
    min: 0,
    custom: (value: number) => {
      if (value && value < 0) {
        return "Discount value cannot be negative";
      }
      return null;
    },
  },
  // Temporary image paths - featured image is required
  temp_featured_image_path: {
    required: true,
    custom: (value: string) => {
      if (!value || value.trim() === "") {
        return "Featured image is required";
      }
      return null;
    },
  },
  temp_gallery_image_paths: {
    required: false,
  },
  // Variations - optional array of variation objects
  variations: {
    required: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    custom: (variations: any[]) => {
      if (variations && variations.length > 0) {
        // Basic validation for variations array
        if (variations.length > 50) {
          return "Maximum 50 variations allowed";
        }
        // Check each variation has required fields
        for (const variation of variations) {
          if (!variation.price || variation.price < 0) {
            return "Each variation must have a valid price";
          }
        }
      }
      return null;
    },
  },
  is_approved: {
    required: false,
    custom: (value: boolean | undefined) => {
      if (value !== undefined && typeof value !== "boolean") {
        return "Approval status must be true or false";
      }
      return null;
    },
  },
};

export function useProductValidation(data: CreateProductData) {
  const validation = useValidation(data, productValidationRules);

  // Product-specific validation helpers
  const validateName = (value: string) => {
    const sanitized = sanitizeInput.text(value);
    return validation.validateSingle("name", sanitized);
  };

  const validateDescription = (value: string) => {
    const sanitized = sanitizeInput.text(value);
    return validation.validateSingle("description", sanitized);
  };

  const validateCategory = (value: string) => {
    return validation.validateSingle("category_id", value);
  };

  const validateKeywords = (keywords: string[]) => {
    return validation.validateSingle("search_keywords", keywords);
  };

  const validateStatus = (status: ProductStatus) => {
    return validation.validateSingle("status", status);
  };

  const validatePhotos = (urls: string[]) => {
    return validation.validateSingle("photo_urls", urls);
  };

  const validateFeaturedPhoto = (url: string) => {
    return validation.validateSingle("featured_photo_url", url);
  };

  // Sanitization helpers
  const sanitizeName = (value: string) => sanitizeInput.text(value);
  const sanitizeDescription = (value: string) => sanitizeInput.text(value);
  const sanitizeKeyword = (value: string) => sanitizeInput.keyword(value);

  // Keyword management helpers
  const isValidKeyword = (keyword: string) => {
    const sanitized = sanitizeKeyword(keyword);
    return sanitized.length >= 2 && sanitized.length <= 50;
  };

  const addKeyword = (keyword: string, currentKeywords: string[] = []) => {
    const sanitized = sanitizeKeyword(keyword);

    if (!isValidKeyword(sanitized)) {
      return { success: false, error: "Keyword must be 2-50 characters" };
    }

    if (currentKeywords.includes(sanitized)) {
      return { success: false, error: "Keyword already exists" };
    }

    if (currentKeywords.length >= 10) {
      return { success: false, error: "Maximum 10 keywords allowed" };
    }

    const newKeywords = [...currentKeywords, sanitized];
    const isValid = validateKeywords(newKeywords);

    return {
      success: isValid,
      keywords: newKeywords,
      error: isValid ? null : validation.errors.search_keywords,
    };
  };

  const removeKeyword = (keyword: string, currentKeywords: string[] = []) => {
    const newKeywords = currentKeywords.filter((k) => k !== keyword);
    validateKeywords(newKeywords);
    return newKeywords;
  };

  return {
    ...validation,
    // Validation helpers
    validateName,
    validateDescription,
    validateCategory,
    validateKeywords,
    validateStatus,
    validatePhotos,
    validateFeaturedPhoto,
    // Sanitization helpers
    sanitizeName,
    sanitizeDescription,
    sanitizeKeyword,
    // Keyword helpers
    isValidKeyword,
    addKeyword,
    removeKeyword,
    // Validation rules (for reference)
    rules: productValidationRules,
  };
}

export type ProductValidation = ReturnType<typeof useProductValidation>;
