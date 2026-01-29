import { CreateSupplierParams } from "@/lib/types/supplier";
import { ValidationRule } from "@/lib/hooks/use-validation";

export const supplierValidationRules: Partial<
  Record<keyof CreateSupplierParams, ValidationRule>
> = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 255,
  },
  description: {
    maxLength: 1000,
  },
  contact_email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: string) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "Invalid email format";
      }
      return null;
    },
  },
  contact_number: {
    minLength: 7,
    maxLength: 20,
    pattern: /^[0-9+\-\s()]+$/,
    custom: (value: string) => {
      if (value && !/^[0-9+\-\s()]+$/.test(value)) {
        return "Invalid phone number format";
      }
      return null;
    },
  },
};

export const validateLinks = (
  links: Array<{ type: string; url: string; label?: string }>
): { isValid: boolean; error?: string } => {
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    if (!link.url.trim()) {
      return {
        isValid: false,
        error: `Link ${i + 1} URL is required`,
      };
    }
    // Basic URL validation
    try {
      new URL(link.url);
    } catch {
      return {
        isValid: false,
        error: `Link ${i + 1} has invalid URL format`,
      };
    }
  }
  return { isValid: true };
};
